export const RenderWithVtShader = {
  uniforms: {
    "tDiffuse"     : { value: null },
    "bDebugLevel"     : { value: false },
    "bDebugCache"     : { value: false },
  },
  fragmentShader: [
    "#include <vt/pars_fragment>",
    "varying vec2 vUv;",
    "uniform sampler2D tDiffuse;",
    "uniform bool bDebugLevel;",
    "uniform bool bDebugCache;",
    "void main() ",
    "{",
      "vec3 uv = computeUvCoords( vUv );",
      "gl_FragColor = textureLod(tDiffuse, bDebugCache ? vUv : uv.xy, 0.);",
      "if (bDebugLevel) gl_FragColor.r = uv.z / fMaxMipMapLevel;",
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
