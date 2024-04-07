#include "common.wgsl"

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  let red = vec4f(1, 0, 0, 1);
  let cyan = vec4f(0, 1, 1, 1);

  let grid = vec2u(fsInput.position.xy) / 4;
  let checker : bool = (grid.x + grid.y) % 2 == 1;

  return select(red, cyan, checker);
}