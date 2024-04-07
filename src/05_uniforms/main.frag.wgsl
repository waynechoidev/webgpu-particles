#include "common.wgsl"

@fragment fn fs() -> @location(0) vec4f {
  return statics.color;
}