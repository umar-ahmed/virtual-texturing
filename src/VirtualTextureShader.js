const uniforms = {
  "bVirtualTextureDebugUvs" : { type: "i", value: 0 },
  "bVirtualTextureDebugDiscontinuities" : { type: "i", value: 0 },
  "bVirtualTextureDebugMipMapLevel" : { type: "i", value: 0 },

  // page cache settings
  "vCachePageSize" : { type: "v2", value: null },
  "vCacheSize" : { type: "v2", value: null },

  "vTextureSize" : { type: "v2", value : null },
  "fMaxMipMapLevel" : { type: "f", value: 0.0 },

  "tCacheIndirection" : {type: "t", value: null},
};


const pars_fragment = [
"#ifdef VIRTUAL_TEXTURE",
  "#extension GL_OES_standard_derivatives : enable",
"#endif",

  "uniform sampler2D tCacheIndirection;",

  "uniform vec2 vCachePageSize;",
  "uniform vec2 vCacheSize;",
  "uniform vec2 vTextureSize;",

  "uniform float fMaxMipMapLevel;",

  "uniform bool bVirtualTextureDebugUvs;",
  "uniform bool bVirtualTextureDebugDiscontinuities;",
  "uniform bool bVirtualTextureDebugMipMapLevel;",

  "vec2 computeUvCoords( vec2 vUv ) {",
    "vec2 UvCoords;",

    "vec3 pageData = texture2D( tCacheIndirection, vUv ).xyz;",
    "float mipExp = exp2(pageData.z);",
    "vec2 inPageOffset = fract(vUv * mipExp) * (vCachePageSize);",
    //"vec2 inPageOffset = fract(vUv * mipExp);",
    //"inPageOffset = (inPageOffset * ((136.0 - 4.0 * 2.0)/136.0 + 4.0/136.0));",
    //"inPageOffset = (inPageOffset * ((136.0 - 4.0 * 2.0)/2048.0) + (4.0/136.0)/2048.0);",

    //withinPageCoord = withinPageCoord ∗ (page dimension−border width ∗ 2.0)/page dimension+ border width/page dimension;

    // gradient lengths and discontinuities
    /*"if( bVirtualTextureDebugDiscontinuities )",
    "{",
      //"vec2 grad = vCachePageSize * exp2(pageData.z);",
      //"vec4 grad_ddx_ddy = vec4(dFdx(vUv), dFdy(vUv) ) * grad.xyxy;",

      "float r = length(dFdx(pageData.xy + inPageOffset));",
      "float g = length(dFdx(pageData.xy + inPageOffset));",

      "gl_FragColor = vec4(r, g, 0, 1);",
      "return;",
    "}",

    // see page-cache UV coordinates
    "if( bVirtualTextureDebugUvs )",
    "{",
      "gl_FragColor = vec4(pageData.xy + inPageOffset, 0, 1);",
      "return;",
    "}",

    // render mip-map level
    "if( bVirtualTextureDebugMipMapLevel )",
    "{",
      "float level = pageData.z;",

      "float red = 0.0;",
      "float green = 0.0;",
      "float blue = 0.0;",

      "float levels =5.0;",
      "float inv = 1.0/(levels+1.0);",
      "float step = inv;",

      "green = clamp((step+level*inv),0.0,1.0);",

      "vec4 color = vec4(red,green,blue,1.0);",
      "gl_FragColor = color;",

      "return;",
    "}",*/

    "return pageData.xy + inPageOffset;",
  "}"
].join("\n");


THREE.UniformsLib[ "vt" ] = uniforms;
THREE.ShaderChunk[ "vt_pars_fragment" ] = pars_fragment;

export const VirtualTextureShader = {
  uniforms: uniforms,
  pars_fragment: pars_fragment
};
