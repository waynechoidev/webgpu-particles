struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
};

const imgSize:vec2u = vec2u(800, 600);