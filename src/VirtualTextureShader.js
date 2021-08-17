import { UniformsLib, ShaderChunk } from '../examples/jsm/three.module.js';

const uniforms = {
  "vt" : { value: {} },
};

const pars_fragment = [
  "precision highp usampler2D;",
  "struct VirtualTexture {",
  " sampler2D texture;",
  " usampler2D cacheIndirection;",
  " vec2 padding;",
  " vec2 tileSize;",
  " vec2 numTiles;",
  " float maxMipMapLevel;",
  "};",

  "vec3 computeUvCoords( vec2 uv, out vec2 gx, out vec2 gy, out vec4 page, in VirtualTexture vt) {",
    "page = vec4(texture2D( vt.cacheIndirection, uv ));",
    "float l = exp2(page.z);",
    "vec2 P = uv * (1.-2.*vt.padding);",
    "vec2 dx = dFdx(P) * l;",
    "vec2 dy = dFdy(P) * l;",
    "gx = dx / vt.numTiles;",
    "gy = dy / vt.numTiles;",
    "dx *= vt.tileSize;",
    "dy *= vt.tileSize;",
    "float d = max(dot( dx, dx ), dot( dy, dy ) );",
    "float z = clamp(0.5 * log2( d ), 0., vt.maxMipMapLevel);",
    "vec2 inPageUv = fract(uv * l);",
    "inPageUv = vt.padding + inPageUv * (1.-2.*vt.padding);",
    "vec4 clamping;",
    "clamping.xy = min(vec2(0.5), exp2(z)/vt.tileSize);",
    "clamping.zw = 1.-clamping.xy;",
    "inPageUv = clamp(inPageUv, clamping.xy, clamping.zw);",
    "vec4 gminmax = clamping - inPageUv.xyxy;",
    "gminmax.xy = max(gminmax.xy, -gminmax.zw);",
    "gminmax.zw = -gminmax.xy;",
    "gx = clamp(gx, gminmax.xy, gminmax.zw);",
    "gy = clamp(gy, gminmax.xy, gminmax.zw);",
    "return vec3((page.xy + inPageUv) / vt.numTiles, z);",
  "}",

  "vec4 vtexture(in VirtualTexture vt, in vec2 uv) {",
      "vec4 page;",
      "vec2 gx, gy;",
      "vec3 uvz = computeUvCoords( uv, gx, gy, page, vt );",
      "return textureGrad(vt.texture, uvz.xy, gx, gy);",
  "}"
].join("\n");


UniformsLib[ "vt" ] = uniforms;
ShaderChunk[ "vt/pars_fragment" ] = pars_fragment;

export const VirtualTextureShader = {
  uniforms: uniforms,
  pars_fragment: pars_fragment
};
