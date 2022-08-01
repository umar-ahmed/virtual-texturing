import { UniformsLib, ShaderChunk } from '../examples/jsm/three.module.js';

const uniforms = {
  "vt" : { value: {} },
};

const pars_fragment = [
  "precision highp usampler2D;",
  "precision highp isampler2D;",

  "struct VirtualTexture {",
  " sampler2D texture;",
  " usampler2D cacheIndirection;",
  " vec2 padding;",
  " vec2 tileSize;",
  " vec2 numPages;",
  " float maxMipMapLevel;",
  " float maxAniso;",
  "};",

  "vec4 vt_textureCoords(in VirtualTexture vt, inout vec2 uv) {",
    // indirection table lookup
    "float bias = log2(min(vt.tileSize.x, vt.tileSize.y)) - 0.5;",
    "vec4 page = vec4(texture( vt.cacheIndirection, uv, bias ));",
    "float l = exp2(page.z);",
    "vec2 inPageUv = fract(uv * l);",
    "vec2 paddingScale = 1.-2.*vt.padding;",
    "inPageUv = vt.padding + inPageUv * paddingScale;",

    // cache texture uv
    "uv = (page.xy + inPageUv) / vt.numPages;",
    "return page;",
  "}",

  "vec4 vt_textureCoordsLod(in VirtualTexture vt, inout vec2 uv, inout float lod) {",
  // indirection table lookup
    "vec4 page = vec4(textureLod( vt.cacheIndirection, uv, lod - 0.5 ));",
    "float l = exp2(page.z);",
    "vec2 inPageUv = fract(uv * l);",
    "vec2 paddingScale = 1.-2.*vt.padding;",
    "inPageUv = vt.padding + inPageUv * paddingScale;",

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

    "vec2 dx = gx * vt.tileSize;",
    "vec2 dy = gy * vt.tileSize;",
    "float dx2 = dot(dx, dx);",
    "float dy2 = dot(dy, dy);",
    "float minLod = vt.maxMipMapLevel + 0.5 * log2( max( min(dx2, dy2), max(dx2, dy2)/vt.maxAniso ));",

  // indirection table lookup
    "vec4 page = vec4(textureLod( vt.cacheIndirection, uv, minLod - 0.5));",
    "float l = exp2(page.z);",
    "vec2 inPageUv = fract(uv * l);",
    "vec2 paddingScale = 1.-2.*vt.padding;",
    "inPageUv = vt.padding + inPageUv * paddingScale;",

    // compute lod
    "vec2 scale = l * paddingScale;",
    "gx *= scale;",
    "gy *= scale;",
    "float d = max(dot( gx, gx ), dot( gy, gy ) );",
    "float lod = clamp(0.5 * log2( d ) - vt.maxMipMapLevel, 0., vt.maxMipMapLevel);",

    // clamp inPageUv
    "vec4 clamping;",
    "clamping.xy = min(vec2(0.5), exp2(lod)/vt.tileSize);",
    "clamping.zw = 1.-clamping.xy;",
    "inPageUv = clamp(inPageUv, clamping.xy, clamping.zw);",

    // compute gradients
    "gx /= vt.numPages;",
    "gy /= vt.numPages;",

    // clamp gradients
    "vec4 gminmax = clamping - inPageUv.xyxy;",
    "gminmax.xy = max(gminmax.xy, -gminmax.zw);",
    "gminmax.zw = -gminmax.xy;",
    "gx = clamp(gx, gminmax.xy, gminmax.zw);",
    "gy = clamp(gy, gminmax.xy, gminmax.zw);",

    // cache texture uv
    "uv = (page.xy + inPageUv) / vt.numPages;",
    "return page;",
  "}",

  "vec4 vt_textureBasic(in VirtualTexture vt, in vec2 uv, out vec4 page) {",
      "page = vt_textureCoords(vt, uv);",
      "return texture(vt.texture, uv);",
  "}",

  "vec4 vt_textureGradBasic(in VirtualTexture vt, in vec2 uv, out vec4 page) {",
      "page = vt_textureCoords(vt, uv);",
      "vec2 gx = dFdx(uv);",
      "vec2 gy = dFdy(uv);",
      "return textureGrad(vt.texture, uv, gx, gy);",
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

  "vec4 vt_textureBasic(in VirtualTexture vt, in vec2 uv) { vec4 page; return vt_textureBasic(vt, uv, page); }",
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
