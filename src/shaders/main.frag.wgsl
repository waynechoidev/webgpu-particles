#include "common.wgsl"

@fragment fn fs(input: OurVertexShaderOutput) -> @location(0) vec4f {

    let dist:f32 = length(vec2f(0.5, 0.5) - input.texCoord) * 5;
    let scale: f32 = smoothstep(0.0, 1.0, smoothstep(0.25, 0.75, 1.0 - dist));

    return vec4f(input.color.rgb * scale, 1);
}