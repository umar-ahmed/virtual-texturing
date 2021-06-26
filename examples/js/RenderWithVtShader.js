export const RenderWithVtShader = {
  uniforms: {
    "tDiffuse"     : { value: null },
    "bDebugLevel"     : { value: false },
    "bDebugCache"     : { value: false },
    "bDebugLastHits"     : { value: false },
    "iTextureMode"     : { value: 0 },
  },
  fragmentShader: [
    "#include <vt/pars_fragment>",
    "varying vec2 vUv;",
    "uniform sampler2D tDiffuse;",
    "uniform bool bDebugLevel;",
    "uniform bool bDebugCache;",
    "uniform bool bDebugLastHits;",
    "uniform int iTextureMode;",
    "void main() ",
    "{",
      "vec4 page;",
      "vec2 gx, gy;",
      "vec3 uv = computeUvCoords( vUv, gx, gy, page );",
      "if (bDebugCache) uv.xy = vUv;",
      "switch (iTextureMode) {",
      "  case 0 : gl_FragColor = textureGrad(tDiffuse, uv.xy, gx, gy); break;",
      "  case 1 : gl_FragColor = textureLod(tDiffuse, uv.xy, uv.z); break;",
      "  case 2 : gl_FragColor = textureGrad(tDiffuse, uv.xy, vec2(0.), vec2(0.)); break;",
      "  case 3 : gl_FragColor = textureLod(tDiffuse, uv.xy, 0.); break;",
      "  case 4 : gl_FragColor = texture(tDiffuse, uv.xy); break;",
      "}",
      "if (bDebugLevel) gl_FragColor.r = page.z / fMaxMipMapLevel;",
      "if (bDebugLastHits) gl_FragColor.g = 1. - (page.w / 255.);",
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
