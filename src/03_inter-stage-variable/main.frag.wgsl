#include "common.wgsl"
@fragment fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}
//@fragment fn main(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
// return fsInput.color;
// }