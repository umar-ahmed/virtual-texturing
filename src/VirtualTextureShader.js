import { UniformsLib, ShaderChunk } from '../examples/jsm/three.module.js';

const uniforms = {
  "vPadding" : { value: [0, 0] },
  "vClamping" : { value: [0, 0] },
  "vNumTiles" : { value : [0, 0] },
  "fMaxMipMapLevel" : { value: 0.0 },
  "tCacheIndirection" : { value: null },
};

const pars_fragment = [
  "precision highp usampler2D;",
  "uniform usampler2D tCacheIndirection;",
  "uniform vec2 vPadding;",
  "uniform vec2 vClamping;",
  "uniform vec2 vNumTiles;",
  "uniform float fMaxMipMapLevel;",

  "vec4 computeUvCoords( vec2 vUv ) {",
    "vec4 page = vec4(texture2D( tCacheIndirection, vUv ));",
    "float l = exp2(page.z);",
    "vec2 inPageUv = fract(vUv * l);",
    "inPageUv = vPadding + inPageUv * (1.-2.*vPadding);",
    "inPageUv = clamp(inPageUv, vClamping, 1.-vClamping);",
    "page.xy = (page.xy + inPageUv) / vNumTiles;",
    "return page;",
  "}"
].join("\n");


UniformsLib[ "vt" ] = uniforms;
ShaderChunk[ "vt/pars_fragment" ] = pars_fragment;

export const VirtualTextureShader = {
  uniforms: uniforms,
  pars_fragment: pars_fragment
};
