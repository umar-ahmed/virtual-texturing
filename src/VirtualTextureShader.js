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
  " vec2 numPages;",
  " float maxMipMapLevel;",
  "};",

  "vec4 vt_textureCoords(in VirtualTexture vt, inout vec2 uv) {",
    // indirection table lookup
    "vec4 page = vec4(texture2D( vt.cacheIndirection, uv ));",
    "float l = exp2(page.z);",
    "vec2 inPageUv = fract(uv * l);",
    "inPageUv = vt.padding + inPageUv * (1.-2.*vt.padding);",

    // cache texture uv
    "uv = (page.xy + inPageUv) / vt.numPages;",
    "return page;",
  "}",

  "vec4 vt_textureCoordsLod(in VirtualTexture vt, inout vec2 uv, inout float lod) {",
  // indirection table lookup
    "vec4 page = vec4(texture2D( vt.cacheIndirection, uv ));",
    "float l = exp2(page.z);",
    "vec2 inPageUv = fract(uv * l);",
    "inPageUv = vt.padding + inPageUv * (1.-2.*vt.padding);",

    // compute lod and move inPageUv so that footprint stays in tile
    "lod = clamp(lod - (vt.maxMipMapLevel - page.z), 0., vt.maxMipMapLevel);",
    "vec4 clamping;",
    "clamping.xy = min(vec2(0.5), exp2(lod)/vt.tileSize);",
    "clamping.zw = 1.-clamping.xy;",
    "inPageUv = clamp(inPageUv, clamping.xy, clamping.zw);",

    // cache texture uv
    "uv = (page.xy + inPageUv) / vt.numPages;",
    "return page;",
  "}",

  "vec4 vt_textureCoordsGrad(in VirtualTexture vt, inout vec2 uv, inout vec2 gx, inout vec2 gy) {",
  // indirection table lookup
    "vec4 page = vec4(texture2D( vt.cacheIndirection, uv ));",
    "float l = exp2(page.z);",
    "vec2 inPageUv = fract(uv * l);",
    "inPageUv = vt.padding + inPageUv * (1.-2.*vt.padding);",



    // compute gradients and move inPageUv so that footprint stays in tile
    "vec2 gfactor = exp2(page.z - vt.maxMipMapLevel) * (1.-2.*vt.padding);",
    "vec2 dx = gx * gfactor;",
    "vec2 dy = gy * gfactor;",
    "gx = dx / (vt.numPages * vt.tileSize);",
    "gy = dy / (vt.numPages * vt.tileSize);",
    "float d = max(dot( dx, dx ), dot( dy, dy ) );",
    "float lod = clamp(0.5 * log2( d ), 0., vt.maxMipMapLevel);",
    "vec4 clamping;",
    "clamping.xy = min(vec2(0.5), exp2(lod)/vt.tileSize);",
    "clamping.zw = 1.-clamping.xy;",
    "inPageUv = clamp(inPageUv, clamping.xy, clamping.zw);",
    "vec4 gminmax = clamping - inPageUv.xyxy;",
    "gminmax.xy = max(gminmax.xy, -gminmax.zw);",
    "gminmax.zw = -gminmax.xy;",
    "gx = clamp(gx, gminmax.xy, gminmax.zw);",
    "gy = clamp(gy, gminmax.xy, gminmax.zw);",

    // cache texture uv
    "uv = (page.xy + inPageUv) / vt.numPages;",
    "return page;",
  "}",

  "vec4 vt_texture(in VirtualTexture vt, in vec2 uv, out vec4 page) {",
      "page = vt_textureCoords(vt, uv);",
      "return texture(vt.texture, uv);",
  "}",

  "vec4 vt_textureLod(in VirtualTexture vt, in vec2 uv, in float lod, out vec4 page) {",
      "float _lod = lod;",
      "page = vt_textureCoordsLod(vt, uv, _lod);",
      "return textureLod(vt.texture, uv, _lod);",
  "}",

  "vec4 vt_textureGrad(in VirtualTexture vt, in vec2 uv, in vec2 gx, in vec2 gy, out vec4 page) {",
      "vec2 _gx = gx;",
      "vec2 _gy = gy;",
      "page = vt_textureCoordsGrad(vt, uv, _gx, _gy);",
      "return textureGrad(vt.texture, uv, _gx, _gy);",
  "}",

  "vec4 vt_texture(in VirtualTexture vt, in vec2 uv) { vec4 page; return vt_texture(vt, uv, page); }",
  "vec4 vt_textureLod(in VirtualTexture vt, in vec2 uv, in float lod) { vec4 page; return vt_textureLod(vt, uv, lod, page); }",
  "vec4 vt_textureGrad(in VirtualTexture vt, in vec2 uv, in vec2 gx, in vec2 gy) { vec4 page; return vt_textureGrad(vt, uv, gx, gy, page); }",

  // vt_texture* aliases for built-in texture* functions
  "vec4 vt_texture(in sampler2D tex, in vec2 uv) { return texture(tex, uv); }",
  "uvec4 vt_texture(in usampler2D tex, in vec2 uv) { return texture(tex, uv); }",
  "ivec4 vt_texture(in isampler2D tex, in vec2 uv) { return texture(tex, uv); }",
  "vec4 vt_textureGrad(in sampler2D tex, in vec2 uv, in vec2 gx, in vec2 gy) { return textureGrad(tex, uv, gx, gy); }",
  "uvec4 vt_textureGrad(in usampler2D tex, in vec2 uv, in vec2 gx, in vec2 gy) { return textureGrad(tex, uv, gx, gy); }",
  "ivec4 vt_textureGrad(in isampler2D tex, in vec2 uv, in vec2 gx, in vec2 gy) { return textureGrad(tex, uv, gx, gy); }",
  "vec4 vt_textureLod(in sampler2D tex, in vec2 uv, in float lod) { return textureLod(tex, uv, lod); }",
  "uvec4 vt_textureLod(in usampler2D tex, in vec2 uv, in float lod) { return textureLod(tex, uv, lod); }",
  "ivec4 vt_textureLod(in isampler2D tex, in vec2 uv, in float lod) { return textureLod(tex, uv, lod); }"

].join("\n");


UniformsLib[ "vt" ] = uniforms;
ShaderChunk[ "vt/pars_fragment" ] = pars_fragment;

export const VirtualTextureShader = {
  uniforms: uniforms,
  pars_fragment: pars_fragment
};
