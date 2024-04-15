#include "common.wgsl"

@group(0) @binding(0) var outputTex : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn computeSomething(
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let texCoord = global_invocation_id.x + global_invocation_id.y * imgSize.x;

    if ((workgroup_id.x % 2 == 0 && workgroup_id.y % 2 == 0) || (workgroup_id.x % 2 != 0 && workgroup_id.y % 2 != 0)) {
        textureStore(outputTex, vec2i(i32(global_invocation_id.x),i32(global_invocation_id.y)), vec4f(1.0, 1.0, 1.0, 1.0));
    } else {
        textureStore(outputTex, vec2i(i32(global_invocation_id.x),i32(global_invocation_id.y)), vec4f(0.0, 0.0, 0.0, 1.0));
    }
}