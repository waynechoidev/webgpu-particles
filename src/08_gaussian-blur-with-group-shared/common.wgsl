struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
};

const GROUP_SIZE:i32 = 256;

const KERNEL_SIZE:i32 = 11;

const kernel = array<f32, KERNEL_SIZE>(
0.05, 0.05, 0.1, 0.1, 0.1, 0.2, 0.1, 0.1, 0.1, 0.05, 0.05
);

const BLUR_RADIUS:i32 = 5;
const CACHE_SIZE:i32 = GROUP_SIZE + (2 * BLUR_RADIUS);