import { UniformsLib, ShaderChunk } from '../examples/jsm/three.module.js';

const uniforms = {
  "fVirtualTextureSize":  { value: [ 0, 0 ] },
  "fMaximumMipMapLevel":  {  value: 0.0 },
  "fTileCount":        { value: [ 0, 0 ] },
  "fVirtualTextureId": { value: 255.0 }
};

const pars_vertex = [
  "varying vec2 vUv;",
].join("\n");

const vertex = [
  "vec4 mvPosition = (modelViewMatrix * vec4( position, 1.0 ));",
  "vUv = uv;",
  "gl_Position = projectionMatrix * mvPosition;"
].join("\n");

const pars_fragment = [

  "uniform vec2 fVirtualTextureSize;",
  "uniform float fMaximumMipMapLevel;",
  "uniform float fVirtualTextureId;",
  "uniform float fTileCount;",

  "varying vec2 vUv;",

  "float MipLevel(vec2 uv, vec2 size)",
  "{",
    "vec2 coordPixels = uv * size;",

    "vec2 dx = dFdx(coordPixels);",
    "vec2 dy = dFdy(coordPixels);",

    "float d = max(dot( dx, dx ), dot( dy, dy ) );",
    "return 0.5 * log2( d ) - 1.0;",
  "}"
].join("\n");

const fragment = [
  "float mipLevel  = floor( MipLevel( vUv, fVirtualTextureSize ));",
  "mipLevel = clamp(mipLevel, 0.0, fMaximumMipMapLevel);",

  "vec4 result;",
  "result.rg = floor( vUv.xy * fTileCount / exp2(mipLevel));", // pageId
  "result.b = mipLevel;",
  "result.a = fVirtualTextureId;",

  "gl_FragColor = result/255.0;"
].join("\n");


UniformsLib[ "vt/visible_tiles" ] = uniforms;
ShaderChunk[ "vt/visible_tiles/pars_vertex" ] = pars_vertex;
ShaderChunk[ "vt/visible_tiles/pars_fragment" ] = pars_fragment;
ShaderChunk[ "vt/visible_tiles/fragment" ] = fragment;
ShaderChunk[ "vt/visible_tiles/vertex" ] = vertex;

export const VisibleTileShader =  {
  uniforms: uniforms,
  fragmentShader: [ pars_fragment, "void main() {", fragment, "}" ].join("\n"),
  vertexShader: [ pars_vertex, "void main() {", vertex, "}" ].join("\n")
};
