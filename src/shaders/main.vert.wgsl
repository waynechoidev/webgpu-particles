#include "common.wgsl"

@vertex fn vs(
  input:Vertex
) -> OurVertexShaderOutput { 
  var vsOutput: OurVertexShaderOutput;
  vsOutput.position = vec4f(input.position, 0.0, 1.0);
  vsOutput.color = input.color;
  vsOutput.texCoord = input.texCoord;
  return vsOutput;
}