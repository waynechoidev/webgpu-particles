#include "common.wgsl"

@group(0) @binding(0) var<storage, read_write> data: array<vec4f>;
  
@compute @workgroup_size(16, 16)
fn computeSomething(
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let texCoord = global_invocation_id.x + global_invocation_id.y * imgSize.x;

    if ((workgroup_id.x % 2 == 0 && workgroup_id.y % 2 == 0) || (workgroup_id.x % 2 != 0 && workgroup_id.y % 2 != 0)) {
        data[texCoord] = vec4f(1.0, 1.0, 1.0, 1.0);
    } else {
        data[texCoord] = vec4f(0.0, 0.0, 0.0, 1.0);
    }
}