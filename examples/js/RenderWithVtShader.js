export const RenderWithVtShader = {
  uniforms: {
      "tDiffuse"     : { value: null },
    },

  fragmentShader: [
    "varying vec2 vUv;",
    "uniform sampler2D tDiffuse;",
    "void main() ",
    "{",
      "vec2 uv = computeUvCoords( vUv );",
      "gl_FragColor = texture2D(tDiffuse, vUv);",
      //"gl_FragColor = texture2D(tDiffuse, vUv);",
      //"gl_FragColor = texture2D(tCacheIndirection, vUv)*30.;",
      //"gl_FragColor.a = 1.;",
      //"gl_FragColor.rg = vUv;",
      //"gl_FragColor.xy = vUv;",
      //"gl_FragColor.ba = vec2(0.,1.);",
    "}"

  ].join("\n"), // end of fragment shader

  vertexShader: [
    "varying vec2 vUv;",
    "void main() {",
      "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
      "vUv = uv;",
      "gl_Position = projectionMatrix * mvPosition;",
    "}"

  ].join("\n") // end of vertex shader
}
