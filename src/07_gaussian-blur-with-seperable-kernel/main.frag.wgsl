#include "common.wgsl"

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(input: OurVertexShaderOutput) -> @location(0) vec4f {
    return textureSample(ourTexture, ourSampler, input.texCoord);
}