#include "common.wgsl"

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

var<workgroup> workgroup_data: array<vec4f, CACHE_SIZE>;
 
@compute @workgroup_size(GROUP_SIZE, 1)
fn computeSomething(
    @builtin(global_invocation_id) global_invocation_id : vec3u,
    @builtin(local_invocation_id) local_invocation_id : vec3u,
) {
    let texCoord = vec2i(global_invocation_id.xy);
    let localCoord = vec2i(local_invocation_id.xy);
    
    let texSize:vec2i = vec2i(textureDimensions(inputTex));
    
    if(localCoord.x < BLUR_RADIUS)
    {
        let x:i32 = max(texCoord.x - BLUR_RADIUS, 0);
        workgroup_data[localCoord.x] = 
            textureLoad(inputTex, vec2i(x, texCoord.y), 0);
    }

    if(localCoord.x >= GROUP_SIZE - BLUR_RADIUS)
    {
        let x:i32 = min(texCoord.x + BLUR_RADIUS, texSize.x - 1);
        workgroup_data[localCoord.x + 2 * BLUR_RADIUS] = 
            textureLoad(inputTex, vec2i(x, texCoord.y), 0);
    }

    workgroup_data[localCoord.x + BLUR_RADIUS] = 
        textureLoad(inputTex, min(texCoord, texSize - 1), 0);
    
    workgroupBarrier();

    var output = vec4f(0.0);

    for (var i = -BLUR_RADIUS; i <= BLUR_RADIUS; i++)
    {
        let k:i32 = localCoord.x + BLUR_RADIUS + i;
        let neighborColor:vec4f = workgroup_data[k];
        
        // Get the corresponding value from the kernel
        let weight:f32 = kernel[i + BLUR_RADIUS];
        
        // Accumulate weighted color values
        output += weight * neighborColor;
    }

    textureStore(outputTex, texCoord, output);
    // textureStore(outputTex, texCoord, workgroup_data[localCoord.x]);
}