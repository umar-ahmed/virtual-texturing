import { UniformsLib, ShaderChunk } from '../examples/jsm/three.module.js';

const uniforms = {
  "vt_size":  { value: [ 0, 0 ] },
  "vt_minMipMapLevel":  {  value: 0.0 },
  "vt_maxMipMapLevel":  {  value: 0.0 },
  "vt_tileCount":        { value: [ 0, 0 ] },
  "vt_id": { value: 255.0 }
};

const pars_vertex = [
  "varying vec2 vUv;",
].join("\n");

const vertex = [
  "vec4 mvPosition = (modelViewMatrix * vec4( position, 1.0 ));",
  "vUv = vec2(uv.x, 1. - uv.y);",
  "gl_Position = projectionMatrix * mvPosition;"
].join("\n");

const pars_fragment = [

  "uniform vec2 vt_size;",
  "uniform float vt_minMipMapLevel;",
  "uniform float vt_maxMipMapLevel;",
  "uniform float vt_id;",
  "uniform float vt_tileCount;",

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
  "float mipLevel  = floor( MipLevel( vUv, vt_size ));",
  "mipLevel = clamp(mipLevel, vt_minMipMapLevel, vt_maxMipMapLevel);",
  "float size = vt_tileCount * exp2(-mipLevel);",
  "vec2 id = floor( vUv.xy * size );",
  "id = clamp(id, 0., size-1.);",
  "gl_FragColor = vec4(id, mipLevel, vt_id)/255.0;"
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
