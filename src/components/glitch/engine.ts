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
} from "./shaders";
import { hex2rgb, instantiate, boxRound, type BoxConfig, type Effect, type GradStop } from "./config";

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
  private echoExtras: Effect[];

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
      blit: mk(FRAG_BLIT),
    };

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.vbo = vbo;

    // echo (duplicate) effects — slice + pixel-stretch, applied last, drawn behind the box
    this.echoExtras = [
      instantiate({ type: "pixstretch", params: { offset: 40, pangle: 0, prot: 0, smooth: 28 } }),
      instantiate({ type: "slice", params: { shift: 24, random: 180 } }),
    ];
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
      this.setF(prog, "u_soft", p.soft);
      this.setF(prog, "u_random", p.random);
      this.setF(prog, "u_tx", p.tx);
      this.setF(prog, "u_ty", p.ty);
      this.setF(prog, "u_srot", p.srot);
      this.setF(prog, "u_sangle", p.sangle);
      this.setF(prog, "u_speed", p.speed || 0);
      this.setF(prog, "u_glitch", p.glitch || 0);
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

  /** composite a box texture onto the screen at a CSS-px rect (rounded-corner mask + opacity) */
  private blit(tex: WebGLTexture, rCss: Rect, round: number, opacity: number, dpr: number) {
    const gl = this.gl;
    const c = this.canvas;
    const res = { w: Math.max(2, Math.floor(rCss.w * dpr)), h: Math.max(2, Math.floor(rCss.h * dpr)) };
    const ox = Math.floor(rCss.x * dpr);
    const oy = c.height - Math.floor(rCss.y * dpr) - res.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

  /** render the whole composition for this frame */
  render(boxes: BoxConfig[], mode: GlitchMode, time: number) {
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (mode === "landing") {
      for (let i = 0; i < boxes.length; i++) {
        const L = boxes[i].layout;
        const er: Rect = {
          x: L.x * W,
          y: Math.min(L.y + L.h * 0.5, 0.9) * H,
          w: L.w * W,
          h: Math.max(L.h * 0.85, 0.14) * H,
        };
        const res = { w: Math.max(2, Math.floor(er.w * dpr)), h: Math.max(2, Math.floor(er.h * dpr)) };
        const tex = this.renderBoxChain(this.echoExtras.concat(boxes[i].effects), res, time);
        this.blit(tex, er, 0, 0.92, dpr);
      }
    }
    for (let i = 0; i < boxes.length; i++) {
      const res = { w: Math.max(2, Math.floor(rects[i].w * dpr)), h: Math.max(2, Math.floor(rects[i].h * dpr)) };
      const tex = this.renderBoxChain(boxes[i].effects, res, time);
      this.blit(tex, rects[i], boxRound(boxes[i]), 1, dpr);
    }
  }

  dispose() {
    const gl = this.gl;
    for (const k in this.prog) gl.deleteProgram(this.prog[k]);
    gl.deleteBuffer(this.vbo);
    if (this.ping) {
      gl.deleteTexture(this.ping.tex);
      gl.deleteFramebuffer(this.ping.fb);
      gl.deleteTexture(this.pong!.tex);
      gl.deleteFramebuffer(this.pong!.fb);
    }
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  }
}
