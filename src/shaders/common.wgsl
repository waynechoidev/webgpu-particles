struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoord: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) texCoord: vec2f,
  @location(2) color: vec4f,
  @location(3) velocity: vec2f,
};