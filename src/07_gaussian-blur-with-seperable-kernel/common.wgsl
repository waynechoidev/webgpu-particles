struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
};

const kernelSize:i32 = 11;

const kernel = array<f32, kernelSize>(
0.05, 0.05, 0.1, 0.1, 0.1, 0.2, 0.1, 0.1, 0.1, 0.05, 0.05
);