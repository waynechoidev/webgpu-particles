#include "common.wgsl"

@group(0) @binding(0) var<storage, read_write> data: array<vec4f>;
  
@compute @workgroup_size(16, 16)
fn computeSomething(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let texCoord:u32 = global_invocation_id.x + global_invocation_id.y * imgSize.x;

    let center_pos = vec2f(f32(imgSize.x) / 2.0, f32(imgSize.y) / 2.0);
    let current_pos = vec2f(f32(global_invocation_id.x), f32(global_invocation_id.y));

    if (distance(current_pos, center_pos) < 200.0) {
        data[texCoord] = vec4f(1.0, 1.0, 1.0, 1.0);
    } else {
        data[texCoord] = vec4f(0.0, 0.0, 0.0, 1.0);
    }
}