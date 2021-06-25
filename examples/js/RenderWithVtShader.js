export const RenderWithVtShader = {
  uniforms: {
    "tDiffuse"     : { value: null },
    "bDebugLevel"     : { value: false },
    "bDebugCache"     : { value: false },
    "bDebugLastHits"     : { value: false },
  },
  fragmentShader: [
    "#include <vt/pars_fragment>",
    "varying vec2 vUv;",
    "uniform sampler2D tDiffuse;",
    "uniform bool bDebugLevel;",
    "uniform bool bDebugCache;",
    "uniform bool bDebugLastHits;",
    "void main() ",
    "{",
      "vec4 uv = computeUvCoords( vUv );",
      "gl_FragColor = textureLod(tDiffuse, bDebugCache ? vUv : uv.xy, 0.);",
      "if (bDebugLevel) gl_FragColor.r = uv.z / fMaxMipMapLevel;",
      "if (bDebugLastHits) gl_FragColor.g = 1. - (uv.w / 255.);",
    "}"

  ].join("\n"), // end of fragment shader

  vertexShader: [
    "varying vec2 vUv;",
    "void main() {",
      "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
      "vUv = vec2(uv.x, 1. - uv.y);",
      "gl_Position = projectionMatrix * mvPosition;",
    "}"

  ].join("\n") // end of vertex shader
}
