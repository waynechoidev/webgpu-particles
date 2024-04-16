#include "common.wgsl"

@group(0) @binding(0) var<storage, read_write> inputVertex: array<Vertex>;
@group(0) @binding(1) var<uniform> delta: f32;
@group(0) @binding(2) var<uniform> numOfVertexPerWorkgroup: i32;

fn euclideanModulo(n: f32, m: f32) -> f32 {
    var res = n - m * floor(n / m);
    if (res < 0.0) {
        res += m;
    }
    return res;
}

fn wrapAround(n: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        euclideanModulo(n.x + 1.0, 2.0) - 1.0,
        euclideanModulo(n.y + 1.0, 2.0) - 1.0
    );
}

@compute @workgroup_size(256)
fn computeSomething(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let speedFactor:f32 = 0.01;
    
    let startIdx = i32(global_invocation_id.x) * numOfVertexPerWorkgroup;
    let endIdx = min(startIdx + numOfVertexPerWorkgroup, 256 * numOfVertexPerWorkgroup);

    for (var idx = startIdx; idx < endIdx; idx++) {
        let input = inputVertex[idx];
        let newPosition = wrapAround(input.position + input.velocity * speedFactor * delta);
        inputVertex[idx] = Vertex(newPosition, input.texCoord, input.color, input.velocity);
    }
}
