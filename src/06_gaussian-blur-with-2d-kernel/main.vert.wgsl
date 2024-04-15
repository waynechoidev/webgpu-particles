#include "common.wgsl"

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
  var pos = array<vec2f, 6>(
    vec2(-1.0, 1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, -1.0),
    vec2(-1.0, -1.0),
    vec2(1.0, 1.0),
    vec2(1.0, -1.0),
  );

  var tex = array<vec2f, 6>(
    vec2(0.0, 0.0),
    vec2(1.0, 0.0),
    vec2(0.0, 1.0),
    vec2(0.0, 1.0),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
  );

  var vsOutput: OurVertexShaderOutput;
  vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  vsOutput.texCoord = tex[vertexIndex];
  return vsOutput;
}