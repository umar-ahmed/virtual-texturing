export const RenderWithVtShader = {
  uniforms: {
    "bDebugLevel"     : { value: false },
    "bDebugCache"     : { value: false },
    "bDebugLastHits"     : { value: false },
    "iTextureMode"     : { value: 0 },
  },
  fragmentShader: [
    "#include <vt/pars_fragment>",
    "varying vec2 vUv;",
    "uniform bool bDebugLevel;",
    "uniform bool bDebugCache;",
    "uniform bool bDebugLastHits;",
    "uniform int iTextureMode;",
    "uniform VirtualTexture vt;",

    "float vt_lod(in vec2 gx, in vec2 gy, in vec2 size) {",
      "vec2 dx = gx * size;",
      "vec2 dy = gy * size;",
      "return 0.5 * log2( max(dot( dx, dx ), dot( dy, dy ) ) );",
    "}",

    "void main() ",
    "{",
    //  "gl_FragColor = vt_texture(vt, vUv); return;",
      "vec2 uv = vUv;",
      "vec2 gx = dFdx(uv);",
      "vec2 gy = dFdy(uv);",
      "vec2 vt_size = exp2(vt.maxMipMapLevel) * vt.tileSize;",
      "vec4 page = vec4(0.);",
      "switch (iTextureMode) {",
      "  case 0 : gl_FragColor = vt_textureGrad(vt, uv, gx, gy, page); break;",
      "  case 1 : gl_FragColor = vt_textureLod(vt, uv, vt_lod(gx, gy, vt_size), page); break;",
      "  case 2 : gl_FragColor = vt_textureGrad(vt, uv, vec2(0.), vec2(0.), page); break;",
      "  case 3 : gl_FragColor = vt_textureLod(vt, uv, 0., page); break;",
      "  case 4 : gl_FragColor = vt_texture(vt, uv, page); break;",
      "}",
      "if (bDebugCache)  switch (iTextureMode) {",
      "  case 0 : gl_FragColor = textureGrad(vt.texture, uv, gx, gy); break;",
      "  case 1 : gl_FragColor = textureLod(vt.texture, uv, vt_lod(gx, gy, vt.numTiles * vt.tileSize)); break;",
      "  case 2 : gl_FragColor = textureGrad(vt.texture, uv, vec2(0.), vec2(0.)); break;",
      "  case 3 : gl_FragColor = textureLod(vt.texture, uv, 0.); break;",
      "  case 4 : gl_FragColor = texture(vt.texture, uv); break;",
      "}",
      "if (bDebugLevel) gl_FragColor.r = page.z / vt.maxMipMapLevel;",
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
