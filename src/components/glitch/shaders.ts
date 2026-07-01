/* WebGL shader sources — ported verbatim from the lab. */
/* eslint-disable */
export const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

export const COMMON = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_px;
const float PI=3.14159265;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash11(float p){p=fract(p*0.1031);p*=p+33.33;p*=p+p;return fract(p);}
float hash21(vec2 p){vec3 q=fract(vec3(p.xyx)*0.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
// multi-stop gradient (piecewise linear, up to 5 stops)
uniform vec3 u_gcol[5];
uniform float u_gpos[5];
uniform int u_gcount;
vec3 sampleGrad(float t){
  t=clamp(t,0.0,1.0);
  vec3 c=u_gcol[0];
  for(int i=0;i<4;i++){
    if(i+1<u_gcount){
      float seg=clamp((t-u_gpos[i])/max(u_gpos[i+1]-u_gpos[i],1e-4),0.0,1.0);
      c=mix(c,u_gcol[i+1],seg);
    }
  }
  return c;
}
`;

/* base fill: a soft vertical luminance ramp so colour effects always have signal */
export const FRAG_FILL = COMMON + `
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float g=0.16+uv.y*0.66;
  gl_FragColor=vec4(vec3(g),1.0);
}`;

/* Chromatic metal — generative liquid-chrome field (ignores input) */
export const FRAG_METAL = COMMON + `
uniform float u_scale,u_stretch,u_angle,u_rough,u_rgbsplit,u_depth,u_repeats,u_offset,u_phase,u_evo,u_speed;
float fbm(vec2 p){
  float s=0.0,amp=0.5,tot=0.0;
  for(int i=0;i<6;i++){s+=amp*vnoise(p);tot+=amp;p=p*2.03+vec2(11.3,7.7);amp*=mix(0.34,0.62,u_rough);}
  return s/tot;
}
float field(vec2 uv,float chan){
  float ang=u_angle*PI/180.0;
  vec2 p=rot(ang)*(uv-0.5);
  p.x*=(0.2+u_stretch/100.0);
  p*=mix(1.0,15.0,u_scale/100.0);
  p+=u_phase/100.0*6.2831;
  p+=u_evo/100.0*7.0;                       // evolution = static seed offset
  p+=chan*u_rgbsplit/100.0*0.5;
  float t=u_time*u_speed/100.0*0.6;         // speed drives subtle movement (0 = static)
  vec2 w=vec2(fbm(p+t),fbm(p.yx-t*0.8));
  float f=fbm(p+w*2.4);
  f=fract(f*max(u_repeats,1.0)+u_offset/100.0);
  // depth -> contrast around 0.5
  f=clamp((f-0.5)*(0.4+u_depth/100.0*1.6)+0.5,0.0,1.0);
  return f;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float r=field(uv,-1.0), g=field(uv,0.0), b=field(uv,1.0);
  vec3 col=vec3(sampleGrad(r).r,sampleGrad(g).g,sampleGrad(b).b);
  gl_FragColor=vec4(col,1.0);
}`;

/* Pixel stretch — hold pixels at an axis line, smearing them into streaks */
export const FRAG_PIXSTRETCH = COMMON + `
uniform sampler2D u_src;
uniform float u_offset,u_smooth,u_falloff,u_tx,u_ty,u_prot,u_pangle;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 pivot=vec2(u_tx,u_ty)/100.0;
  float ang=(u_pangle+u_prot)*PI/180.0;
  vec2 dir=vec2(cos(ang),sin(ang));
  float off=u_offset/100.0;
  float sm=u_smooth/100.0;
  float fall=u_falloff/100.0;
  float t=dot(uv-pivot,dir);
  float d=t-off;                                   // signed distance past the line
  float pull = sm>0.001 ? smoothstep(0.0,sm,abs(d)) : 1.0;
  if(fall>0.001) pull *= (1.0-smoothstep(0.0,fall,abs(d)));
  float side = (off>=0.0) ? step(off,t) : step(t,off);
  pull *= side;
  vec2 sampleUV = uv - dir*(d*pull);               // pull sample back to the line
  gl_FragColor=texture2D(u_src,clamp(sampleUV,0.0,1.0));
}`;

/* Gradient map — remap luminance through gradient */
export const FRAG_GRADMAP = COMMON + `
uniform sampler2D u_src;
uniform float u_scatter,u_offset,u_repeatType,u_repeatFreq,u_mixSpace;
float toLin(float c){return c<=0.04045?c/12.92:pow((c+0.055)/1.055,2.4);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec3 s=texture2D(u_src,uv).rgb;
  vec3 lc=(u_mixSpace>0.5)?vec3(toLin(s.r),toLin(s.g),toLin(s.b)):s;
  float L=dot(lc,vec3(0.299,0.587,0.114));
  float j=(hash21(floor(uv*u_px))-0.5)*u_scatter/100.0*0.5;
  float t=L*max(u_repeatFreq,1.0)+u_offset/100.0+j;
  if(u_repeatType<0.5){ t=clamp(t,0.0,1.0); }              // none
  else if(u_repeatType<1.5){ t=fract(t); }                  // repeat
  else { t=abs(fract(t*0.5)*2.0-1.0); }                     // mirror
  gl_FragColor=vec4(sampleGrad(t),1.0);
}`;

/* Pattern refraction — displace sampling by a pattern, with dispersion + frost */
export const FRAG_REFRACT = COMMON + `
uniform sampler2D u_src;
uniform float u_pattern,u_strength,u_smooth,u_frost,u_disp,u_edge;
uniform float u_tx,u_ty,u_pscale,u_pangle;
vec2 wrapUV(vec2 uv){
  if(u_edge<0.5) return clamp(uv,0.0,1.0);                   // clamp
  else if(u_edge<1.5) return fract(uv);                      // repeat
  else return abs(fract(uv*0.5)*2.0-1.0);                    // mirror
}
float pat(vec2 p){
  if(u_pattern<0.5){                                         // waves
    return sin(p.x*6.2831+p.y*2.0)*0.5+cos(p.y*6.2831)*0.5;
  } else if(u_pattern<1.5){                                  // rings
    return sin(length(p-0.5)*30.0);
  } else if(u_pattern<2.5){                                  // grid
    return sign(sin(p.x*18.0)*sin(p.y*18.0));
  }
  return vnoise(p*8.0)*2.0-1.0;                              // noise
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 c=vec2(u_tx,u_ty)/100.0;
  vec2 q=rot(u_pangle*PI/180.0)*(uv-c);
  q*=mix(0.5,4.0,u_pscale);
  float sm=mix(1.0,6.0,u_smooth/100.0);
  vec2 grad=vec2(pat(q+vec2(0.01,0.0))-pat(q-vec2(0.01,0.0)),
                 pat(q+vec2(0.0,0.01))-pat(q-vec2(0.0,0.01)))/(0.02*sm);
  vec2 disp=grad*(u_strength/100.0)*0.18;
  vec2 fr=(vec2(hash21(floor(uv*u_px)),hash21(floor(uv*u_px)+7.3))-0.5)*u_frost/100.0*0.03;
  float d=u_disp/100.0*0.5;
  vec3 col;
  col.r=texture2D(u_src,wrapUV(uv+disp*(1.0+d)+fr)).r;
  col.g=texture2D(u_src,wrapUV(uv+disp+fr)).g;
  col.b=texture2D(u_src,wrapUV(uv+disp*(1.0-d)+fr)).b;
  gl_FragColor=vec4(col,1.0);
}`;

/* Slice shift — horizontal rows displaced by seeded random */
export const FRAG_SLICE = COMMON + `
uniform sampler2D u_src;
uniform float u_shift,u_shiftV,u_soft,u_random,u_tx,u_ty,u_srot,u_sangle,u_speed,u_glitch;
// per-band displacement: smooth drift (Speed) + glitchy stepped bursts (Glitch). amp = shift %.
float bandShift(float band, float amp){
  float t=u_time*u_speed*0.2;
  float a=hash11(band*1.7+u_random+floor(t));
  float b=hash11(band*1.7+u_random+floor(t)+1.0);
  float sh=(mix(a,b,smoothstep(0.0,1.0,fract(t)))-0.5)*amp/100.0;
  float g=u_glitch/100.0;
  float gt=floor(u_time*(3.0+g*22.0));
  float gate=step(1.0-g*0.75,hash11(gt*1.7+band*0.37));
  sh+=(hash11(gt+band*2.3)-0.5)*g*(amp/100.0)*2.5*gate;
  return sh;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 c=vec2(u_tx,u_ty)/100.0;
  vec2 p=rot(u_srot*PI/180.0)*(uv-c)+c;
  float soft=u_soft/100.0;
  // horizontal: shift rows along X
  float N=8.0+floor(mod(u_random,40.0))+8.0;
  float rowf=p.y*N, row=floor(rowf), frac=fract(rowf);
  float sh=bandShift(row,u_shift), shN=bandShift(row+1.0,u_shift);
  float s=mix(sh,shN, soft<=0.001?0.0:smoothstep(1.0-soft,1.0,frac));
  // vertical: shift columns along Y
  float M=8.0+floor(mod(u_random*1.7+3.0,40.0))+8.0;
  float colf=p.x*M, col=floor(colf), fracv=fract(colf);
  float sv=bandShift(col+100.0,u_shiftV), svN=bandShift(col+101.0,u_shiftV);
  float sV=mix(sv,svN, soft<=0.001?0.0:smoothstep(1.0-soft,1.0,fracv));
  vec2 dirH=rot(u_sangle*PI/180.0)*vec2(1.0,0.0);
  vec2 dirV=rot(u_sangle*PI/180.0)*vec2(0.0,1.0);
  gl_FragColor=texture2D(u_src,clamp(uv+dirH*s+dirV*sV,0.0,1.0));
}`;

/* Glitch — animated digital glitch: stepped block/line displacement + RGB tear */
export const FRAG_GLITCH = COMMON + `
uniform sampler2D u_src;
uniform float u_amount,u_speed,u_blocks,u_rgb,u_seed;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float amt=u_amount/100.0;
  float t=floor(u_time*(1.0+u_speed*0.14));          // stepped time -> jumpy, not smooth
  float band=floor(uv.y*max(u_blocks,1.0));
  float r=hash21(vec2(band, t+u_seed));
  float active=step(1.0-amt*0.9, hash21(vec2(band*1.7+7.0, t*1.3+u_seed)));
  float dx=(r-0.5)*amt*0.5*active;                   // per-band horizontal jump
  float tear=step(0.98-amt*0.06, hash21(vec2(t,u_seed)))*(hash21(vec2(band,t))-0.5)*amt*0.8;
  dx+=tear;
  float rgb=u_rgb/100.0*amt*0.06;
  vec2 pp=uv+vec2(dx,0.0);
  vec3 col;
  col.r=texture2D(u_src,clamp(pp+vec2(rgb,0.0),0.0,1.0)).r;
  col.g=texture2D(u_src,clamp(pp,0.0,1.0)).g;
  col.b=texture2D(u_src,clamp(pp-vec2(rgb,0.0),0.0,1.0)).b;
  col+=(hash21(vec2(band,t+3.0))-0.5)*amt*0.15*active; // block flicker
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;

/* Dither — ordered Bayer quantization */
export const FRAG_DITHER = COMMON + `
uniform sampler2D u_src;
uniform float u_style,u_size,u_levels,u_bright,u_contrast,u_mono;
uniform vec3 u_monoCol;
float bayer2(vec2 a){a=floor(a);return fract(a.x/2.0+a.y*a.y*0.75);}
float bayer4(vec2 a){return bayer2(0.5*a)*0.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(0.5*a)*0.25+bayer2(a);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec3 c=texture2D(u_src,uv).rgb;
  c=(c-0.5)*u_contrast+0.5;              // contrast
  c*=u_bright/100.0;                     // brightness
  c=clamp(c,0.0,1.0);
  vec2 pc=uv*u_px/max(u_size,1.0);
  float th;
  if(u_style<0.5) th=bayer2(pc);
  else if(u_style<1.5) th=bayer4(pc);
  else th=bayer8(pc);
  th-=0.5;
  float lv=max(u_levels,2.0)-1.0;
  if(u_mono>0.5){
    float L=dot(c,vec3(0.299,0.587,0.114));
    L=floor(L*lv+0.5+th)/lv;
    gl_FragColor=vec4(u_monoCol*L,1.0);
  } else {
    c=floor(c*lv+0.5+th)/lv;
    gl_FragColor=vec4(c,1.0);
  }
}`;

/* Composite blit — draw a box texture to screen with rounded-corner mask */
export const FRAG_BLIT = COMMON + `
uniform sampler2D u_src;
uniform vec2 u_origin;   // rect origin in device px (from bottom-left)
uniform vec2 u_size;     // rect size in device px
uniform float u_round;   // corner radius 0..1 of half-min-dim
uniform float u_opacity;
uniform float u_useSrcAlpha;  // 1 = respect source texture alpha (for full-layer composites)
void main(){
  vec2 local=(gl_FragCoord.xy-u_origin)/u_size;   // 0..1
  vec4 src=texture2D(u_src,local);
  // rounded rect coverage
  vec2 halfpx=u_size*0.5;
  float r=u_round*min(halfpx.x,halfpx.y);
  vec2 pxy=(local-0.5)*u_size;                    // px from center
  vec2 d=abs(pxy)-(halfpx-r);
  float dist=length(max(d,0.0))+min(max(d.x,d.y),0.0)-r;
  float a=(1.0-smoothstep(-1.0,1.0,dist))*u_opacity*mix(1.0,src.a,u_useSrcAlpha);
  gl_FragColor=vec4(src.rgb,a);
}`;
