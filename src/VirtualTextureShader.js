import { UniformsLib, ShaderChunk } from '../examples/jsm/three.module.js';

const uniforms = {
  "vPadding" : { value: [0, 0] },
  "vTileSize" : { value: [0, 0] },
  "vNumTiles" : { value : [0, 0] },
  "fMaxMipMapLevel" : { value: 0.0 },
  "tCacheIndirection" : { value: null },
};

const pars_fragment = [
  "precision highp usampler2D;",
  "uniform vec2 vPadding;",
  "uniform vec2 vTileSize;",
  "uniform vec2 vNumTiles;",
  "uniform float fMaxMipMapLevel;",
  "uniform usampler2D tCacheIndirection;",

  "vec3 computeUvCoords( vec2 uv, out vec2 gx, out vec2 gy, out vec4 page) {",
    "page = vec4(texture2D( tCacheIndirection, uv ));",
    "float l = exp2(page.z);",
    "vec2 P = uv * (1.-2.*vPadding);",
    "vec2 dx = dFdx(P) * l;",
    "vec2 dy = dFdy(P) * l;",
    "gx = dx / vNumTiles;",
    "gy = dy / vNumTiles;",
    "dx *= vTileSize;",
    "dy *= vTileSize;",
    "float d = max(dot( dx, dx ), dot( dy, dy ) );",
    "float z = clamp(0.5 * log2( d ), 0., fMaxMipMapLevel);",
    "vec2 inPageUv = fract(uv * l);",
    "inPageUv = vPadding + inPageUv * (1.-2.*vPadding);",
    "vec4 clamping;",
    "clamping.xy = min(vec2(0.5), exp2(z)/vTileSize);",
    "clamping.zw = 1.-clamping.xy;",
    "inPageUv = clamp(inPageUv, clamping.xy, clamping.zw);",
    "vec4 gminmax = clamping - inPageUv.xyxy;",
    "gminmax.xy = max(gminmax.xy, -gminmax.zw);",
    "gminmax.zw = -gminmax.xy;",
    "gx = clamp(gx, gminmax.xy, gminmax.zw);",
    "gy = clamp(gy, gminmax.xy, gminmax.zw);",
    "return vec3((page.xy + inPageUv) / vNumTiles, z);",
  "}"
].join("\n");


UniformsLib[ "vt" ] = uniforms;
ShaderChunk[ "vt/pars_fragment" ] = pars_fragment;

export const VirtualTextureShader = {
  uniforms: uniforms,
  pars_fragment: pars_fragment
};
