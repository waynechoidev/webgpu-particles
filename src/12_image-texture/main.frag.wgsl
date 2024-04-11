#include "common.wgsl"

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  return textureSampleLevel(ourTexture, ourSampler, fsInput.texcoord, 5);
}