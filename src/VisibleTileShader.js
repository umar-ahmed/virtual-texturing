
const uniforms = {
  "fVirtualTextureSize":  { type: "v2", value: null },
  "fMaximumMipMapLevel":  { type: "f", value: 0.0 },
  "fTileCount":        { type: "v2", value: null },
  "fVirtualTextureId": { type: "f", value: 255.0 }
};

const pars_vertex = [
  "varying vec2 vUv;",
].join("\n");

const vertex = [
  "vec4 mvPosition = (modelViewMatrix * vec4( position, 1.0 ));",
  "vUv = vec2(uv.x, 1.0 - uv.y);",
  "gl_Position = projectionMatrix * mvPosition;"
].join("\n");

const pars_fragment = [
  "#extension GL_OES_standard_derivatives : enable",
  "#extension GL_OES_texture_float_linear : enable",

  "uniform vec2 fVirtualTextureSize;",
  "uniform float fMaximumMipMapLevel;",
  "uniform float fVirtualTextureId;",
  "uniform vec2 fTileCount;",

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
  "float mipLevel  = floor( MipLevel( vUv, fVirtualTextureSize ));",
  "mipLevel = clamp(mipLevel, 0.0, fMaximumMipMapLevel);",

  "vec4 result;",
  "result.rg = floor( vUv.xy * fTileCount / exp2(mipLevel));", // pageId
  "result.b = mipLevel;",
  "result.a = fVirtualTextureId;",

  "gl_FragColor = result/255.0;"
].join("\n");


THREE.UniformsLib[ "vt_visible_tiles" ] = uniforms;
THREE.ShaderChunk[ "vt_visible_tiles_pars_vertex" ] = pars_vertex;
THREE.ShaderChunk[ "vt_visible_tiles_pars_fragment" ] = pars_fragment;
THREE.ShaderChunk[ "vt_visible_tiles_fragment" ] = fragment;
THREE.ShaderChunk[ "vt_visible_tiles_vertex" ] = vertex;

export const VisibleTileShader =  {
  uniforms: THREE.UniformsUtils.clone( uniforms ),
  fragmentShader: [ pars_fragment, "void main() {", fragment, "}" ].join("\n"),
  vertexShader: [ pars_vertex, "void main() {", vertex, "}" ].join("\n")
};
