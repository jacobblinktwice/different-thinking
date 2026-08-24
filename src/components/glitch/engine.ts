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
} from "./shaders";
import { hex2rgb, instantiate, boxRound, type BoxConfig, type Effect, type GradStop, type LayerConfig, type FrontLayerConfig } from "./config";

export type GlitchMode = "grid" | "landing";
type FBO = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };
type Res = { w: number; h: number };
const REF = 900;

/* appear easings — the site's motion mix (keep in sync with the --ease-* tokens
   in globals.css). Boxes alternate the two snappy curves for a glitchy, uneven
   attack; the dup/front layers grow on the smooth curve behind them.
   Solve x(t) for t by bisection (x is monotonic for x1,x2 ∈ [0,1]), return y(t). */
type Bez = { x1: number; y1: number; x2: number; y2: number };
const EASE_APPEAR: Bez = { x1: 0, y1: 1, x2: 0, y2: 1 }; // instant burst, long settle
const EASE_SMOOTH: Bez = { x1: 0.997, y1: -0.011, x2: 0.015, y2: 0.995 }; // echo fade
function bezY(c: Bez, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  let t = p;
  for (let i = 0; i < 18; i++) {
    t = (lo + hi) / 2;
    const u = 1 - t;
    const x = 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t;
    if (x < p) lo = t;
    else hi = t;
  }
  const u = 1 - t;
  return Math.max(0, 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t);
}

export class GlitchEngine {
  readonly gl: WebGLRenderingContext;
  readonly canvas: HTMLCanvasElement;
  /** clear colour (0..1 rgb) */
  bg: [number, number, number] = [0.988, 0.988, 0.941];
  /** cap for devicePixelRatio */
  dprCap = 2;
  /** logical resolution for pixel-based effects (dither cells, noise grain). 900 = the tuned
      site look; raise for hi-res exports so grain stays fine instead of scaling up chunky. */
  refRes = REF;
  /** global glitch-intensity multiplier (1 = baseline); driven by pointer/scroll interaction. */
  private gmul = 1;

  private prog: Record<string, WebGLProgram> = {};
  private vbo: WebGLBuffer;
  private ping: FBO | null = null;
  private pong: FBO | null = null;
  private fboW = 0;
  private fboH = 0;
  // full-canvas buffers for the whole-layer duplicate
  private scene: FBO | null = null;
  private dupA: FBO | null = null;
  private dupB: FBO | null = null;
  private sceneW = 0;
  private sceneH = 0;
  // per-activation random start rects for the appear animation: [x, y, size] in 0..1
  private appearSeeds: [number, number, number][] = [];
  private lastAppear = 1;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
      alpha: false, // opaque canvas — box coverage composites over the paper, never bleeds page white
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
      const R = this.refRes;
      if (lpx) gl.uniform2f(lpx, ar >= 1 ? R : R * ar, ar >= 1 ? R / ar : R);
    }
    if (srcTex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform1i(this.U(prog, "u_src"), 0);
    }
    const p = (e ? e.params : {}) as Record<string, number | boolean | string>;
    // global glitch-intensity multiplier applied to displacement/chroma params (baseline = 1)
    const g = this.gmul;
    const gx = (v: unknown) => Number(v) * g;
    if (type === "metal") {
      this.setGrad(prog, e!.grad);
      this.setF(prog, "u_scale", p.scale);
      this.setF(prog, "u_stretch", p.stretch);
      this.setF(prog, "u_angle", p.angle);
      this.setF(prog, "u_rough", p.rough);
      this.setF(prog, "u_rgbsplit", gx(p.rgbsplit));
      this.setF(prog, "u_depth", p.depth);
      this.setF(prog, "u_repeats", p.repeats);
      this.setF(prog, "u_offset", p.offset);
      this.setF(prog, "u_phase", p.phase);
      this.setF(prog, "u_evo", p.evo);
      this.setF(prog, "u_speed", p.speed);
    } else if (type === "pixstretch") {
      this.setF(prog, "u_offset", gx(p.offset));
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
      this.setF(prog, "u_strength", gx(p.strength));
      this.setF(prog, "u_smooth", p.smooth);
      this.setF(prog, "u_frost", p.frost);
      this.setF(prog, "u_disp", gx(p.disp));
      this.setF(prog, "u_edge", p.edge);
      this.setF(prog, "u_tx", p.tx);
      this.setF(prog, "u_ty", p.ty);
      this.setF(prog, "u_pscale", Number(p.pscale) / 100);
      this.setF(prog, "u_pangle", p.pangle);
    } else if (type === "slice") {
      this.setF(prog, "u_shift", gx(p.shift));
      this.setF(prog, "u_shiftV", gx(p.shiftV || 0));
      this.setF(prog, "u_soft", p.soft);
      this.setF(prog, "u_random", p.random);
      this.setF(prog, "u_tx", p.tx);
      this.setF(prog, "u_ty", p.ty);
      this.setF(prog, "u_srot", p.srot);
      this.setF(prog, "u_sangle", p.sangle);
      this.setF(prog, "u_speed", p.speed || 0);
      this.setF(prog, "u_glitch", gx(p.glitch || 0));
    } else if (type === "glitch") {
      this.setF(prog, "u_amount", gx(p.amount));
      this.setF(prog, "u_speed", p.speed);
      this.setF(prog, "u_blocks", p.blocks);
      this.setF(prog, "u_rgb", gx(p.rgb));
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
    opts?: { target?: WebGLFramebuffer | null; useSrcAlpha?: boolean }
  ) {
    const gl = this.gl;
    const c = this.canvas;
    const res = { w: Math.max(2, Math.floor(rCss.w * dpr)), h: Math.max(2, Math.floor(rCss.h * dpr)) };
    const ox = Math.floor(rCss.x * dpr);
    const oy = c.height - Math.floor(rCss.y * dpr) - res.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, opts?.target ?? null);
    // composite over the destination (screen) so coverage crops against the paper;
    // straight-write into the scene FBO (blend off) so its alpha carries true coverage.
    if (opts?.target) {
      gl.disable(gl.BLEND);
    } else {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    gl.viewport(ox, oy, res.w, res.h);
    const prog = this.prog.blit;
    gl.useProgram(prog);
    this.bindAttr(prog);
    gl.uniform2f(this.U(prog, "u_res"), c.width, c.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.U(prog, "u_src"), 0);
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

  /** render the whole composition for this frame. glitchMul = global glitch-intensity multiplier
      (1 = baseline), driven by pointer/scroll interaction in the <Glitch> component. */
  render(
    boxes: BoxConfig[],
    mode: GlitchMode,
    time: number,
    layer?: LayerConfig | null,
    glitchMul?: number,
    frontLayer?: FrontLayerConfig | null,
    appear = 1,
    appearIn = true
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

    // appear: each box animates in FROM a random position and size (stable per
    // activation via appearSeeds), staggered per box, on EASE_APPEAR — an extreme
    // ease-in: the scattered boxes hold, then slam into the real layout at the
    // end. Closing mirrors it in time (1 - ease(1 - p)): a quick scatter back
    // toward the random rects while fading out.
    if (appearIn && this.lastAppear <= 0 && appear > 0) {
      this.appearSeeds = boxes.map(() => [Math.random(), Math.random(), Math.random()]);
    }
    this.lastAppear = appear;
    while (this.appearSeeds.length < boxes.length) {
      this.appearSeeds.push([Math.random(), Math.random(), Math.random()]);
    }
    const ease = (c: Bez, p: number) => (appearIn ? bezY(c, p) : 1 - bezY(c, 1 - p));
    const stag = boxes.length > 1 ? 0.12 : 0;
    const seg = 1 - stag * (boxes.length - 1);
    const progressOf = (i: number) =>
      appear >= 1 ? 1 : ease(EASE_APPEAR, Math.min(1, Math.max(0, (appear - stag * i) / seg)));
    // the dup/front groups are built FROM the scene, whose boxes already animate —
    // transforming the group blits too would compound. The echo instead fades in
    // on the smooth curve for depth.
    const layerEase = appear >= 1 ? 1 : ease(EASE_SMOOTH, appear);
    // transition boost: while the boxes are in flight, crank the displacement-type
    // params (slice shift, pixel stretch, glitch, rgb split — everything gmul
    // touches, incl. the echo/front group passes). Follows the SAME easing as the
    // movement (EASE_APPEAR, un-staggered) so distortion unwinds in step with it.
    const trans = appear >= 1 ? 0 : 1 - ease(EASE_APPEAR, Math.min(1, Math.max(0, appear)));
    this.gmul = (glitchMul == null ? 1 : glitchMul) * (1 + trans * 2);

    const drawBox = (i: number, target: WebGLFramebuffer | null) => {
      const s = progressOf(i);
      // closing: fade the scattered boxes out as they fly back
      const opacity = appearIn ? 1 : Math.min(1, s * 1.5);
      if (!appearIn && opacity <= 0.01) return;
      let r = rects[i];
      if (s < 1) {
        const [ry, rx, rs] = this.appearSeeds[i];
        const sw = r.w * (0.15 + rs * 1.1); // random start size: 0.15–1.25× final
        const sh = r.h * (0.15 + rs * 1.1);
        const sx = rx * Math.max(0, W - sw);
        const sy = ry * Math.max(0, H - sh);
        r = {
          x: sx + (r.x - sx) * s,
          y: sy + (r.y - sy) * s,
          w: sw + (r.w - sw) * s,
          h: sh + (r.h - sh) * s,
        };
      }
      const res = { w: Math.max(2, Math.floor(r.w * dpr)), h: Math.max(2, Math.floor(r.h * dpr)) };
      const b = boxes[i];
      const round = boxRound(b);
      const tex = this.renderBoxChain(b.effects, res, time);
      this.blit(tex, r, round, opacity, dpr, { target });
    };

    const doLayer = mode === "landing" && !!layer && layer.enabled;
    const doFront = mode === "landing" && !!frontLayer && frontLayer.enabled;

    // screen background
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (!doLayer && !doFront) {
      // draw boxes in order (back → front)
      for (let i = 0; i < boxes.length; i++) drawBox(i, null);
      return;
    }

    const full: Res = { w: c.width, h: c.height };

    // composite all boxes into a full-canvas scene buffer — the source for the behind-duplicate
    // and the front-boxes layer.
    this.ensureScene(c.width, c.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene!.fb);
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    for (let i = 0; i < boxes.length; i++) drawBox(i, this.scene!.fb);

    // run the scene through a slice-shift (H+V) then pixel-stretch; returns the result texture (dupB)
    const applyPasses = (slice: Record<string, number | boolean | string>, pix: Record<string, number | boolean | string>) => {
      const sliceE = instantiate({ type: "slice", params: slice });
      const pixE = instantiate({ type: "pixstretch", params: pix });
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.dupA!.fb);
      gl.viewport(0, 0, c.width, c.height);
      this.drawPass("slice", sliceE, this.scene!.tex, full, time);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.dupB!.fb);
      gl.viewport(0, 0, c.width, c.height);
      this.drawPass("pixstretch", pixE, this.dupA!.tex, full, time);
      return this.dupB!.tex;
    };

    // 1) duplicate layer, behind, at its offset + opacity — its boxes already grow
    //    inside the scene; the echo itself fades in on the smooth curve
    if (doLayer && layerEase >= 0.01) {
      const dupTex = applyPasses(layer!.slice, layer!.pixstretch);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, c.width, c.height);
      gl.enable(gl.BLEND);
      this.blit(
        dupTex,
        { x: (layer!.offsetX / 100) * W, y: (layer!.offsetY / 100) * H, w: W, h: H },
        0,
        layer!.opacity * layerEase,
        dpr,
        { useSrcAlpha: true }
      );
    }

    // 2) front boxes, on top: as one slice+pixel-stretched group (doFront), else
    //    individually. Full-rect blit — the boxes inside already animate.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, c.width, c.height);
    gl.enable(gl.BLEND);
    if (doFront) {
      const frontTex = applyPasses(frontLayer!.slice, frontLayer!.pixstretch);
      this.blit(frontTex, { x: 0, y: 0, w: W, h: H }, 0, 1, dpr, { useSrcAlpha: true });
    } else {
      for (let i = 0; i < boxes.length; i++) drawBox(i, null);
    }
  }

  dispose() {
    const gl = this.gl;
    for (const k in this.prog) gl.deleteProgram(this.prog[k]);
    gl.deleteBuffer(this.vbo);
    for (const f of [this.ping, this.pong, this.scene, this.dupA, this.dupB]) {
      if (f) {
        gl.deleteTexture(f.tex);
        gl.deleteFramebuffer(f.fb);
      }
    }
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  }
}
