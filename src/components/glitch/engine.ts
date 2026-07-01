/* Framework-agnostic WebGL engine for the glitch effect.
   Multi-pass ping-pong pipeline: each effect is its own shader pass reading the
   previous pass's texture, composited per box. Ported from the lab. */
import {
  VERT,
  FRAG_FILL,
  FRAG_METAL,
  FRAG_PIXSTRETCH,
  FRAG_GRADMAP,
  FRAG_REFRACT,
  FRAG_SLICE,
  FRAG_DITHER,
  FRAG_BLIT,
  FRAG_GLITCH,
  FRAG_MASK,
} from "./shaders";
import { hex2rgb, instantiate, boxRound, type BoxConfig, type Effect, type GradStop, type LayerConfig } from "./config";

export type GlitchMode = "grid" | "landing";
type FBO = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };
type Res = { w: number; h: number };
const REF = 900;

export class GlitchEngine {
  readonly gl: WebGLRenderingContext;
  readonly canvas: HTMLCanvasElement;
  /** clear colour (0..1 rgb) */
  bg: [number, number, number] = [0.988, 0.988, 0.941];
  /** cap for devicePixelRatio */
  dprCap = 2;

  private prog: Record<string, WebGLProgram> = {};
  private vbo: WebGLBuffer;
  private ping: FBO | null = null;
  private pong: FBO | null = null;
  private fboW = 0;
  private fboH = 0;
  private maskPing: FBO | null = null;
  private maskPong: FBO | null = null;
  private maskW = 0;
  private maskH = 0;
  // full-canvas buffers for the whole-layer duplicate
  private scene: FBO | null = null;
  private dupA: FBO | null = null;
  private dupB: FBO | null = null;
  private sceneW = 0;
  private sceneH = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    this.canvas = canvas;

    const mk = (frag: string) => this.makeProg(frag);
    this.prog = {
      fill: mk(FRAG_FILL),
      metal: mk(FRAG_METAL),
      pixstretch: mk(FRAG_PIXSTRETCH),
      gradmap: mk(FRAG_GRADMAP),
      refract: mk(FRAG_REFRACT),
      slice: mk(FRAG_SLICE),
      dither: mk(FRAG_DITHER),
      glitch: mk(FRAG_GLITCH),
      mask: mk(FRAG_MASK),
      blit: mk(FRAG_BLIT),
    };

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.vbo = vbo;
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || "shader compile error");
    }
    return sh;
  }

  private makeProg(frag: string): WebGLProgram {
    const gl = this.gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, this.compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || "program link error");
    }
    return p;
  }

  private bindAttr(prog: WebGLProgram) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  private U(prog: WebGLProgram, name: string) {
    return this.gl.getUniformLocation(prog, name);
  }
  private setF(prog: WebGLProgram, name: string, v: unknown) {
    const l = this.U(prog, name);
    if (l) this.gl.uniform1f(l, Number(v));
  }
  private setGrad(prog: WebGLProgram, grad?: GradStop[] | null) {
    const gl = this.gl;
    const cols: number[] = [];
    const pos: number[] = [];
    const g = grad || [
      { p: 0, c: "#000" },
      { p: 1, c: "#fff" },
    ];
    for (let i = 0; i < 5; i++) {
      const s = g[Math.min(i, g.length - 1)];
      const rgb = hex2rgb(s.c);
      cols.push(rgb[0], rgb[1], rgb[2]);
      pos.push(g[i] ? g[i].p : 1);
    }
    gl.uniform3fv(this.U(prog, "u_gcol"), cols);
    gl.uniform1fv(this.U(prog, "u_gpos"), pos);
    gl.uniform1i(this.U(prog, "u_gcount"), Math.min(g.length, 5));
  }

  private makeFBO(w: number, h: number): FBO {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  private ensureFBO(w: number, h: number) {
    const gl = this.gl;
    if (w === this.fboW && h === this.fboH && this.ping) return;
    if (this.ping) {
      gl.deleteTexture(this.ping.tex);
      gl.deleteFramebuffer(this.ping.fb);
      gl.deleteTexture(this.pong!.tex);
      gl.deleteFramebuffer(this.pong!.fb);
    }
    this.fboW = w;
    this.fboH = h;
    this.ping = this.makeFBO(w, h);
    this.pong = this.makeFBO(w, h);
  }

  private ensureMaskFBO(w: number, h: number) {
    const gl = this.gl;
    if (w === this.maskW && h === this.maskH && this.maskPing) return;
    if (this.maskPing) {
      gl.deleteTexture(this.maskPing.tex);
      gl.deleteFramebuffer(this.maskPing.fb);
      gl.deleteTexture(this.maskPong!.tex);
      gl.deleteFramebuffer(this.maskPong!.fb);
    }
    this.maskW = w;
    this.maskH = h;
    this.maskPing = this.makeFBO(w, h);
    this.maskPong = this.makeFBO(w, h);
  }

  /** render the box mask: a rounded-rect silhouette distorted by the mask effect chain */
  private renderMask(effects: Effect[], res: Res, round: number, time: number): WebGLTexture {
    const gl = this.gl;
    this.ensureMaskFBO(res.w, res.h);
    gl.disable(gl.BLEND);
    // base rounded-rect coverage
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskPing!.fb);
    gl.viewport(0, 0, res.w, res.h);
    const mp = this.prog.mask;
    gl.useProgram(mp);
    this.bindAttr(mp);
    gl.uniform2f(this.U(mp, "u_res"), res.w, res.h);
    gl.uniform1f(this.U(mp, "u_round"), round || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // distort the silhouette (processed bottom→top, like content)
    let src = this.maskPing!;
    let dst = this.maskPong!;
    for (const e of effects.slice().reverse().filter((x) => x.on)) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, res.w, res.h);
      this.drawPass(e.type, e, src.tex, res, time);
      const tmp = src;
      src = dst;
      dst = tmp;
    }
    return src.tex;
  }

  /** one effect pass: read srcTex, write to the bound framebuffer */
  private drawPass(type: string, e: Effect | null, srcTex: WebGLTexture | null, res: Res, time: number) {
    const gl = this.gl;
    const prog = this.prog[type];
    gl.useProgram(prog);
    this.bindAttr(prog);
    gl.uniform2f(this.U(prog, "u_res"), res.w, res.h);
    gl.uniform1f(this.U(prog, "u_time"), time);
    {
      const ar = res.w / res.h;
      const lpx = this.U(prog, "u_px");
      if (lpx) gl.uniform2f(lpx, ar >= 1 ? REF : REF * ar, ar >= 1 ? REF / ar : REF);
    }
    if (srcTex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform1i(this.U(prog, "u_src"), 0);
    }
    const p = (e ? e.params : {}) as Record<string, number | boolean | string>;
    if (type === "metal") {
      this.setGrad(prog, e!.grad);
      this.setF(prog, "u_scale", p.scale);
      this.setF(prog, "u_stretch", p.stretch);
      this.setF(prog, "u_angle", p.angle);
      this.setF(prog, "u_rough", p.rough);
      this.setF(prog, "u_rgbsplit", p.rgbsplit);
      this.setF(prog, "u_depth", p.depth);
      this.setF(prog, "u_repeats", p.repeats);
      this.setF(prog, "u_offset", p.offset);
      this.setF(prog, "u_phase", p.phase);
      this.setF(prog, "u_evo", p.evo);
      this.setF(prog, "u_speed", p.speed);
    } else if (type === "pixstretch") {
      this.setF(prog, "u_offset", p.offset);
      this.setF(prog, "u_smooth", p.smooth);
      this.setF(prog, "u_falloff", p.falloff);
      this.setF(prog, "u_tx", p.tx);
      this.setF(prog, "u_ty", p.ty);
      this.setF(prog, "u_prot", p.prot);
      this.setF(prog, "u_pangle", p.pangle);
    } else if (type === "gradmap") {
      this.setGrad(prog, e!.grad);
      this.setF(prog, "u_scatter", p.scatter);
      this.setF(prog, "u_offset", p.offset);
      this.setF(prog, "u_repeatType", p.repeatType);
      this.setF(prog, "u_repeatFreq", p.repeatFreq);
      this.setF(prog, "u_mixSpace", p.mixSpace);
    } else if (type === "refract") {
      this.setF(prog, "u_pattern", p.pattern);
      this.setF(prog, "u_strength", p.strength);
      this.setF(prog, "u_smooth", p.smooth);
      this.setF(prog, "u_frost", p.frost);
      this.setF(prog, "u_disp", p.disp);
      this.setF(prog, "u_edge", p.edge);
      this.setF(prog, "u_tx", p.tx);
      this.setF(prog, "u_ty", p.ty);
      this.setF(prog, "u_pscale", Number(p.pscale) / 100);
      this.setF(prog, "u_pangle", p.pangle);
    } else if (type === "slice") {
      this.setF(prog, "u_shift", p.shift);
      this.setF(prog, "u_shiftV", p.shiftV || 0);
      this.setF(prog, "u_soft", p.soft);
      this.setF(prog, "u_random", p.random);
      this.setF(prog, "u_tx", p.tx);
      this.setF(prog, "u_ty", p.ty);
      this.setF(prog, "u_srot", p.srot);
      this.setF(prog, "u_sangle", p.sangle);
      this.setF(prog, "u_speed", p.speed || 0);
      this.setF(prog, "u_glitch", p.glitch || 0);
    } else if (type === "glitch") {
      this.setF(prog, "u_amount", p.amount);
      this.setF(prog, "u_speed", p.speed);
      this.setF(prog, "u_blocks", p.blocks);
      this.setF(prog, "u_rgb", p.rgb);
      this.setF(prog, "u_seed", p.seed);
    } else if (type === "dither") {
      this.setF(prog, "u_style", p.style);
      this.setF(prog, "u_size", p.size);
      this.setF(prog, "u_levels", p.levels);
      this.setF(prog, "u_bright", p.bright);
      this.setF(prog, "u_contrast", p.contrast);
      this.setF(prog, "u_mono", p.mono ? 1 : 0);
      const rgb = hex2rgb((p.monoCol as string) || "#ffffff");
      gl.uniform3f(this.U(prog, "u_monoCol"), rgb[0], rgb[1], rgb[2]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** render one box's effect chain (processed bottom→top), return the result texture */
  private renderBoxChain(effects: Effect[], res: Res, time: number): WebGLTexture {
    const gl = this.gl;
    this.ensureFBO(res.w, res.h);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.ping!.fb);
    gl.viewport(0, 0, res.w, res.h);
    this.drawPass("fill", null, null, res, time);
    let src = this.ping!;
    let dst = this.pong!;
    const chain = effects.slice().reverse().filter((e) => e.on);
    for (const e of chain) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, res.w, res.h);
      this.drawPass(e.type, e, src.tex, res, time);
      const tmp = src;
      src = dst;
      dst = tmp;
    }
    return src.tex;
  }

  private ensureScene(w: number, h: number) {
    const gl = this.gl;
    if (w === this.sceneW && h === this.sceneH && this.scene) return;
    for (const f of [this.scene, this.dupA, this.dupB]) {
      if (f) {
        gl.deleteTexture(f.tex);
        gl.deleteFramebuffer(f.fb);
      }
    }
    this.sceneW = w;
    this.sceneH = h;
    this.scene = this.makeFBO(w, h);
    this.dupA = this.makeFBO(w, h);
    this.dupB = this.makeFBO(w, h);
  }

  /** composite a texture at a CSS-px rect. target=null → screen. useSrcAlpha respects the source's alpha. */
  private blit(
    tex: WebGLTexture,
    rCss: Rect,
    round: number,
    opacity: number,
    dpr: number,
    opts?: { target?: WebGLFramebuffer | null; useSrcAlpha?: boolean; mask?: WebGLTexture | null }
  ) {
    const gl = this.gl;
    const c = this.canvas;
    const res = { w: Math.max(2, Math.floor(rCss.w * dpr)), h: Math.max(2, Math.floor(rCss.h * dpr)) };
    const ox = Math.floor(rCss.x * dpr);
    const oy = c.height - Math.floor(rCss.y * dpr) - res.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, opts?.target ?? null);
    gl.viewport(ox, oy, res.w, res.h);
    const prog = this.prog.blit;
    gl.useProgram(prog);
    this.bindAttr(prog);
    gl.uniform2f(this.U(prog, "u_res"), c.width, c.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.U(prog, "u_src"), 0);
    // mask sampler (unit 1) — always bound to something to keep the sampler valid
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, opts?.mask ?? tex);
    gl.uniform1i(this.U(prog, "u_mask"), 1);
    gl.uniform1f(this.U(prog, "u_hasMask"), opts?.mask ? 1 : 0);
    gl.uniform2f(this.U(prog, "u_origin"), ox, oy);
    gl.uniform2f(this.U(prog, "u_size"), res.w, res.h);
    gl.uniform1f(this.U(prog, "u_round"), round || 0);
    gl.uniform1f(this.U(prog, "u_opacity"), opacity == null ? 1 : opacity);
    gl.uniform1f(this.U(prog, "u_useSrcAlpha"), opts?.useSrcAlpha ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private dpr() {
    return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, this.dprCap);
  }

  /** size the drawing buffer to the canvas's CSS box × dpr. Returns true if it changed. */
  resize(): boolean {
    const c = this.canvas;
    const dpr = this.dpr();
    const w = Math.floor(c.clientWidth * dpr);
    const h = Math.floor(c.clientHeight * dpr);
    if (w > 0 && h > 0 && (c.width !== w || c.height !== h)) {
      c.width = w;
      c.height = h;
      return true;
    }
    return false;
  }

  /** render the whole composition for this frame. mouse = normalized pointer offset from centre (-1..1). */
  render(
    boxes: BoxConfig[],
    mode: GlitchMode,
    time: number,
    layer?: LayerConfig | null,
    mouse?: { x: number; y: number } | null
  ) {
    const gl = this.gl;
    const c = this.canvas;
    if (c.width === 0 || c.height === 0) return;
    const dpr = this.dpr();
    const W = c.clientWidth;
    const H = c.clientHeight;
    const rects: Rect[] = boxes.map((b) => ({
      x: b.layout.x * W,
      y: b.layout.y * H,
      w: b.layout.w * W,
      h: b.layout.h * H,
    }));

    // parallax: deeper (near) items shift more; sign gives near/far opposite motion. off in grid.
    const pAmt = ((layer?.parallax ?? 0) / 100) * 0.09;
    const mx = mouse ? mouse.x : 0;
    const my = mouse ? mouse.y : 0;
    const par = (depth: number) => ({
      x: mx * (depth - 0.5) * pAmt * W * 2,
      y: my * (depth - 0.5) * pAmt * H * 2,
    });
    const boxDepth = (i: number) => boxes[i].depth ?? 0.5;

    const drawBox = (i: number, target: WebGLFramebuffer | null, offset: { x: number; y: number }) => {
      const res = { w: Math.max(2, Math.floor(rects[i].w * dpr)), h: Math.max(2, Math.floor(rects[i].h * dpr)) };
      const b = boxes[i];
      const round = boxRound(b);
      // mask effects distort the box silhouette; render the mask BEFORE the content
      // (different FBO pools, so both textures stay valid for the composite)
      const maskTex = b.mask && b.mask.some((m) => m.on) ? this.renderMask(b.mask, res, round, time) : null;
      const tex = this.renderBoxChain(b.effects, res, time);
      this.blit(tex, { x: rects[i].x + offset.x, y: rects[i].y + offset.y, w: rects[i].w, h: rects[i].h }, round, 1, dpr, { target, mask: maskTex });
    };

    const doLayer = mode === "landing" && !!layer && layer.enabled;

    // screen background
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (!doLayer) {
      // z-order boxes by depth (back → front); parallax only when a mouse is supplied
      [...boxes.keys()].sort((a, b) => boxDepth(a) - boxDepth(b)).forEach((i) => drawBox(i, null, par(boxDepth(i))));
      return;
    }

    // 1) composite all mains (base positions) into a full-canvas scene buffer for the duplicate
    this.ensureScene(c.width, c.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene!.fb);
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    for (let i = 0; i < boxes.length; i++) drawBox(i, this.scene!.fb, { x: 0, y: 0 });

    // 2) whole-layer duplicate: slice-shift (H+V) then pixel-stretch across the entire scene
    const full: Res = { w: c.width, h: c.height };
    const sliceE = instantiate({ type: "slice", params: layer!.slice });
    const pixE = instantiate({ type: "pixstretch", params: layer!.pixstretch });
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dupA!.fb);
    gl.viewport(0, 0, c.width, c.height);
    this.drawPass("slice", sliceE, this.scene!.tex, full, time);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dupB!.fb);
    gl.viewport(0, 0, c.width, c.height);
    this.drawPass("pixstretch", pixE, this.dupA!.tex, full, time);

    // 3) z-ordered draw to screen: boxes + the duplicate layer, sorted by depth (scatter across Z)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, c.width, c.height);
    gl.enable(gl.BLEND);
    type Item = { dup: boolean; depth: number; i: number };
    const items: Item[] = boxes.map((_, i) => ({ dup: false, depth: boxDepth(i), i }));
    items.push({ dup: true, depth: layer!.depth, i: -1 });
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) {
      const off = par(it.depth);
      if (it.dup) {
        this.blit(
          this.dupB!.tex,
          { x: (layer!.offsetX / 100) * W + off.x, y: (layer!.offsetY / 100) * H + off.y, w: W, h: H },
          0,
          layer!.opacity,
          dpr,
          { useSrcAlpha: true }
        );
      } else {
        drawBox(it.i, null, off);
      }
    }
  }

  dispose() {
    const gl = this.gl;
    for (const k in this.prog) gl.deleteProgram(this.prog[k]);
    gl.deleteBuffer(this.vbo);
    for (const f of [this.ping, this.pong, this.maskPing, this.maskPong, this.scene, this.dupA, this.dupB]) {
      if (f) {
        gl.deleteTexture(f.tex);
        gl.deleteFramebuffer(f.fb);
      }
    }
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  }
}
