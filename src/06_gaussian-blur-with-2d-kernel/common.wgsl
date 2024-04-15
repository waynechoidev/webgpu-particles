struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
};

const imgSize:vec2f = vec2f(800.0, 600.0);