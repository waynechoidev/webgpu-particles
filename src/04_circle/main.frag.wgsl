#include "common.wgsl"

@group(0) @binding(0) var<storage, read_write> data: array<vec4f>;

@fragment fn fs(input: OurVertexShaderOutput) -> @location(0) vec4f {
    let x: u32 = u32(input.texCoord.x * f32(imgSize.x));
    let y: u32 = u32(input.texCoord.y * f32(imgSize.y));
    let index: u32 = y * imgSize.x + x;
    return data[index];
    // return vec4f(1.0,0.0,0.0,0.0);
}