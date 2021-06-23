import { UniformsLib, ShaderChunk } from '../examples/jsm/three.module.js';

const uniforms = {
  "vCachePageSize" : { value: [0, 0] },
  "vCacheSize" : { value: [0, 0] },
  "vTextureSize" : { value : [0, 0] },
  "fMaxMipMapLevel" : { value: 0.0 },
  "tCacheIndirection" : { value: null },
};

const pars_fragment = [
  "uniform sampler2D tCacheIndirection;",
  "uniform vec2 vCachePageSize;",
  "uniform vec2 vCacheSize;",
  "uniform vec2 vTextureSize;",
  "uniform float fMaxMipMapLevel;",

  "vec2 computeUvCoords( vec2 vUv ) {",
    "vec3 pageData = texture2D( tCacheIndirection, vUv ).xyz;",
    "float mipExp = exp2(pageData.z);",
    "vec2 inPageOffset = fract(vUv * mipExp) * (vCachePageSize);",
    "return pageData.xy + inPageOffset;",
  "}"
].join("\n");


UniformsLib[ "vt" ] = uniforms;
ShaderChunk[ "vt/pars_fragment" ] = pars_fragment;

export const VirtualTextureShader = {
  uniforms: uniforms,
  pars_fragment: pars_fragment
};
