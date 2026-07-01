// @ts-nocheck
/* Effect schema (UI metadata + defaults), gradient presets, and the baked default config.
   Ported verbatim from the lab so the component is the single source of truth. */
export const SEL = (opts,val)=>({type:'select',options:opts,val});
export const NUM = (label,min,max,step,val,unit)=>({label,min,max,step,val,unit:unit||''});
export const SCHEMA = {
  metal:{ name:'Chromatic metal', hasGrad:'metalGrad', params:{
    rounding: NUM('Rounding',0,100,1,0,'%'),
    depth:    NUM('Depth',0,100,1,100,'%'),
    rough:    NUM('Roughness',0,100,1,0,'%'),
    rgbsplit: NUM('RGB split',0,100,1,100,'%'),
    scale:    NUM('Scale',0,100,1,20,'%'),
    stretch:  NUM('Stretch',0,300,1,200,'%'),
    angle:    NUM('Angle',-180,180,1,30,'°'),
    repeats:  NUM('Repeats',1,8,1,2,'×'),
    offset:   NUM('Offset',0,100,1,0,'%'),
    phase:    NUM('Phase',0,100,1,0,'%'),
    evo:      NUM('Evolution',0,100,1,0,'%'),
    speed:    NUM('Speed',0,100,1,25,'%'),
  }},
  pixstretch:{ name:'Pixel stretch', params:{
    offset:  NUM('Offset',-100,100,1,-17,'%'),
    smooth:  NUM('Smoothness',0,100,1,26,'%'),
    falloff: NUM('Falloff',0,100,1,0,'%'),
    __t:'Transform',
    tx: NUM('X',0,100,0.1,50,'%'),
    ty: NUM('Y',0,100,0.1,50,'%'),
    prot: NUM('R',0,360,0.01,127.92,'°'),
    pangle: NUM('A',-180,180,0.01,-18.44,'°'),
  }},
  gradmap:{ name:'Gradient map', hasGrad:'mapGrad', params:{
    scatter:    NUM('Scatter',0,100,0.1,26.4,'%'),
    offset:     NUM('Offset',0,100,0.1,10.7,'%'),
    repeatType: SEL(['None','Repeat','Mirror'],2),
    repeatFreq: NUM('Repeat freq',1,8,1,1,'×'),
    mixSpace:   SEL(['sRGB','Linear'],0),
  }},
  refract:{ name:'Pattern refraction', params:{
    pattern:  SEL(['Waves','Rings','Grid','Noise'],0),
    strength: NUM('Strength',-100,100,1,-36,''),
    smooth:   NUM('Smoothness',0,100,1,33,'%'),
    frost:    NUM('Frost',0,100,1,100,'%'),
    disp:     NUM('Dispersion',0,100,1,100,'%'),
    edge:     SEL(['Clamp','Repeat','Mirror'],0),
    __t:'Transform',
    tx: NUM('X',0,100,0.1,50,'%'),
    ty: NUM('Y',0,100,0.1,50,'%'),
    pscale: NUM('Scale',0,100,0.01,8.16,'%'),
    pangle: NUM('Angle',0,360,0.1,45,'°'),
  }},
  slice:{ name:'Slice shift', params:{
    shift:  NUM('Shift X',0,100,1,60,'%'),
    shiftV: NUM('Shift Y',0,100,1,0,'%'),
    soft:   NUM('Softness',0,100,1,0,'%'),
    random: NUM('Random',0,500,1,165,''),
    speed:  NUM('Speed',0,100,1,0,'%'),
    glitch: NUM('Glitch',0,100,1,0,'%'),
    __t:'Transform',
    tx: NUM('X',0,100,0.1,50,'%'),
    ty: NUM('Y',0,100,0.1,50,'%'),
    srot: NUM('R',0,720,0.01,385.96,'°'),
    sangle: NUM('A',0,360,1,0,'°'),
  }},
  glitch:{ name:'Glitch', params:{
    amount: NUM('Amount',0,100,1,45,'%'),
    speed:  NUM('Speed',0,100,1,45,'%'),
    blocks: NUM('Blocks',2,60,1,18,''),
    rgb:    NUM('RGB shift',0,100,1,50,'%'),
    seed:   NUM('Seed',0,500,1,20,''),
  }},
  dither:{ name:'Dither', params:{
    style:    SEL(['Bayer 2×2','Bayer 4×4','Bayer 8×8'],2),
    size:     NUM('Size',1,16,1,7,''),
    levels:   NUM('Levels',2,16,1,2,''),
    bright:   NUM('Brightness',0,200,1,73,'%'),
    contrast: NUM('Contrast',0,4,0.01,1,''),
    mono:     {type:'toggle',val:false,label:'Mono'},
    monoCol:  {type:'color',val:'#FFFFFF',label:'Mono color'},
  }},
};

export const GRAD_METAL = [{p:0,c:'#FFFFFF'},{p:0.55,c:'#7A7A7A'},{p:1,c:'#2B2B2B'}];
export const GR_RED    = [{p:0,c:'#FFFFFF'},{p:0.5,c:'#FF2D5E'},{p:1,c:'#5B0E3E'}];
export const GR_TEAL   = [{p:0,c:'#FFFFFF'},{p:0.45,c:'#19C6A6'},{p:1,c:'#0B4D6B'}];
export const GR_BLUE   = [{p:0,c:'#FFFFFF'},{p:0.5,c:'#2E7BFF'},{p:1,c:'#0A1E7A'}];
export const GR_PURPLE = [{p:0,c:'#FFFFFF'},{p:0.45,c:'#C026D3'},{p:1,c:'#4C1D95'}];

export const SAVED=[{"box":1,"layout":{"x":0.34700000000000003,"y":0.183,"w":0.23600000000000002,"h":0.31},"effects":[{"type":"gradmap","on":true,"params":{"scatter":41.6,"offset":40.3,"repeatType":2,"repeatFreq":1,"mixSpace":0},"grad":[{"p":0,"c":"#56f0ca"},{"p":0.45,"c":"#f9432f"},{"p":1,"c":"#ff0000"}]},{"type":"pixstretch","on":true,"params":{"offset":21,"smooth":16,"falloff":89,"tx":50,"ty":50,"prot":165.91,"pangle":-18.44}},{"type":"slice","on":true,"params":{"shift":38,"soft":6,"random":17,"tx":50,"ty":50,"srot":0,"sangle":0}},{"type":"refract","on":false,"params":{"pattern":1,"strength":31,"smooth":0,"frost":75,"disp":28,"edge":0,"tx":50,"ty":50,"pscale":0,"pangle":45}},{"type":"dither","on":true,"params":{"style":0,"size":11,"levels":6,"bright":52,"contrast":1.77,"mono":false,"monoCol":"#FFFFFF"}},{"type":"metal","on":true,"params":{"rounding":0,"depth":55,"rough":0,"rgbsplit":35,"scale":0,"stretch":240,"angle":34,"repeats":2,"offset":0,"phase":0,"evo":0,"speed":24},"grad":[{"p":0,"c":"#FFFFFF"},{"p":0.55,"c":"#7A7A7A"},{"p":1,"c":"#2B2B2B"}]}]},{"box":2,"layout":{"x":0.113,"y":0.31,"w":0.44,"h":0.37},"effects":[{"type":"gradmap","on":true,"params":{"scatter":26.4,"offset":10.7,"repeatType":2,"repeatFreq":1,"mixSpace":0},"grad":[{"p":0,"c":"#FFFFFF"},{"p":0.45,"c":"#19C6A6"},{"p":1,"c":"#0B4D6B"}]},{"type":"pixstretch","on":true,"params":{"offset":8,"smooth":38,"falloff":97,"tx":50,"ty":50,"prot":165.91,"pangle":-18.44}},{"type":"slice","on":true,"params":{"shift":11,"soft":0,"random":0,"tx":50,"ty":50,"srot":0,"sangle":0}},{"type":"refract","on":true,"params":{"pattern":0,"strength":-43,"smooth":0,"frost":100,"disp":52,"edge":0,"tx":50,"ty":50,"pscale":0,"pangle":45}},{"type":"dither","on":true,"params":{"style":2,"size":16,"levels":2,"bright":66,"contrast":1.77,"mono":false,"monoCol":"#FFFFFF"}},{"type":"metal","on":true,"params":{"rounding":0,"depth":100,"rough":0,"rgbsplit":35,"scale":12,"stretch":240,"angle":34,"repeats":2,"offset":0,"phase":0,"evo":0,"speed":24},"grad":[{"p":0,"c":"#FFFFFF"},{"p":0.55,"c":"#7A7A7A"},{"p":1,"c":"#2B2B2B"}]}]},{"box":3,"layout":{"x":0.308,"y":0.47,"w":0.382,"h":0.322},"effects":[{"type":"gradmap","on":true,"params":{"scatter":57.9,"offset":0,"repeatType":2,"repeatFreq":1,"mixSpace":0},"grad":[{"p":0,"c":"#00fbff"},{"p":0.45,"c":"#ff3860"},{"p":1,"c":"#3b05ff"}]},{"type":"slice","on":true,"params":{"shift":11,"soft":0,"random":0,"tx":50,"ty":50,"srot":0,"sangle":0}},{"type":"pixstretch","on":true,"params":{"offset":0,"smooth":0,"falloff":60,"tx":50,"ty":50,"prot":165.91,"pangle":-18.44}},{"type":"refract","on":true,"params":{"pattern":1,"strength":9,"smooth":71,"frost":100,"disp":53,"edge":1,"tx":50,"ty":50,"pscale":0,"pangle":45}},{"type":"dither","on":true,"params":{"style":2,"size":16,"levels":2,"bright":66,"contrast":1.77,"mono":false,"monoCol":"#FFFFFF"}},{"type":"metal","on":true,"params":{"rounding":0,"depth":90,"rough":0,"rgbsplit":94,"scale":21,"stretch":128,"angle":34,"repeats":3,"offset":0,"phase":0,"evo":0,"speed":24},"grad":[{"p":0,"c":"#FFFFFF"},{"p":0.55,"c":"#7A7A7A"},{"p":1,"c":"#2B2B2B"}]}]},{"box":4,"layout":{"x":0.628,"y":0.248,"w":0.23399999999999999,"h":0.502},"effects":[{"type":"gradmap","on":true,"params":{"scatter":26.4,"offset":10.7,"repeatType":2,"repeatFreq":1,"mixSpace":0},"grad":[{"p":0,"c":"#2aeaca"},{"p":0.45,"c":"#6338ff"},{"p":1,"c":"#750066"}]},{"type":"pixstretch","on":true,"params":{"offset":-3,"smooth":0,"falloff":72,"tx":50,"ty":50,"prot":165.91,"pangle":-18.44}},{"type":"slice","on":true,"params":{"shift":11,"soft":0,"random":0,"tx":50,"ty":50,"srot":0,"sangle":0}},{"type":"refract","on":true,"params":{"pattern":3,"strength":32,"smooth":26,"frost":91,"disp":57,"edge":1,"tx":50,"ty":50,"pscale":0,"pangle":45}},{"type":"dither","on":false,"params":{"style":2,"size":16,"levels":2,"bright":66,"contrast":1.77,"mono":false,"monoCol":"#FFFFFF"}},{"type":"metal","on":true,"params":{"rounding":0,"depth":76,"rough":0,"rgbsplit":67,"scale":26,"stretch":0,"angle":-83,"repeats":2,"offset":0,"phase":0,"evo":0,"speed":24},"grad":[{"p":0,"c":"#FFFFFF"},{"p":0.55,"c":"#7A7A7A"},{"p":1,"c":"#2B2B2B"}]}]}];
export const CFG_VERSION = 6;
