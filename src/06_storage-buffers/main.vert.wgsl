#include "common.wgsl"

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

  let dynamics = dynamicStorage[instanceIndex];
  let statics = staticStorage[instanceIndex];

  var vsOut: VSOutput;
  vsOut.position = vec4f(
      pos[vertexIndex] * dynamics.scale + statics.offset, 0.0, 1.0);
  vsOut.color = statics.color;
  return vsOut;
}