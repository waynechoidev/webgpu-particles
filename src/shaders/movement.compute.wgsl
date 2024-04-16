#include "common.wgsl"

@group(0) @binding(0) var<storage, read_write> inputVertex: array<Vertex>;
@group(0) @binding(1) var<uniform> delta: f32;
@group(0) @binding(2) var<uniform> size: vec2f;
@group(0) @binding(3) var<uniform> numOfVertexPerWorkgroup: i32;

@compute @workgroup_size(256)
fn computeSomething(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let speedFactor:f32 = 0.1;
    let screenRatio = size.x/size.y;

    let startIdx = i32(global_invocation_id.x) * numOfVertexPerWorkgroup;
    let endIdx = min(startIdx + numOfVertexPerWorkgroup, 256 * numOfVertexPerWorkgroup);

    for (var idx = startIdx; idx < endIdx; idx++) {
        let input = inputVertex[idx];
        let velocity = vec2f(-input.position.y, input.position.x * screenRatio) * input.speed;
        inputVertex[idx] = Vertex(input.position + velocity * speedFactor * delta, input.texCoord, input.color, input.speed);
    }
}
