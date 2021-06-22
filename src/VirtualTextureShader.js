const uniforms = {
  "vCachePageSize" : { type: "v2", value: null },
  "vCacheSize" : { type: "v2", value: null },
  "vTextureSize" : { type: "v2", value : null },
  "fMaxMipMapLevel" : { type: "f", value: 0.0 },
  "tCacheIndirection" : {type: "t", value: null},
};

const pars_fragment = [
  "uniform sampler2D tCacheIndirection;",
  "uniform vec2 vCachePageSize;",
  "uniform vec2 vCacheSize;",
  "uniform vec2 vTextureSize;",
  "uniform float fMaxMipMapLevel;",

  "vec2 computeUvCoords( vec2 vUv ) {",
    "vec2 UvCoords;",
    "vec3 pageData = texture2D( tCacheIndirection, vUv ).xyz;",
    "float mipExp = exp2(pageData.z);",
    "vec2 inPageOffset = fract(vUv * mipExp) * (vCachePageSize);",
    "return pageData.xy + inPageOffset;",
  "}"
].join("\n");


THREE.UniformsLib[ "vt" ] = uniforms;
THREE.ShaderChunk[ "vt_pars_fragment" ] = pars_fragment;

export const VirtualTextureShader = {
  uniforms: uniforms,
  pars_fragment: pars_fragment
};
