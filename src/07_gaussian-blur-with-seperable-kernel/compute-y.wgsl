#include "common.wgsl"

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn computeSomething(
    @builtin(workgroup_id) workgroup_id : vec3u,
    @builtin(global_invocation_id) global_invocation_id : vec3u,
) {
    let texCoord = vec2i(i32(global_invocation_id.x),i32(global_invocation_id.y));
    let texSize:vec2u = textureDimensions(inputTex);

    var output = vec4f(0.0);
    
    for (var i = -kernelSize/2; i <= kernelSize/2; i++)
    {
        let neighborID = clamp(
            texCoord + vec2i(0, i),
            vec2i(0, 0),
            vec2i(i32(texSize.x) - 1, i32(texSize.y) - 1)
        );
        let neighborColor:vec4f = textureLoad(inputTex, neighborID.xy, 0);
        
        // Get the corresponding value from the kernel
        let weight:f32 = kernel[(i + kernelSize/2)];
        
        // Accumulate weighted color values
        output += weight * neighborColor;
    }

    textureStore(outputTex, texCoord, output);
}