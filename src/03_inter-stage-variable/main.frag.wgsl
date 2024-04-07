#include "common.wgsl"

@fragment fn main(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  return fsInput.color;
}