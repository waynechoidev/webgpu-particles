struct StaticUniforms {
  color: vec4f,
  offset: vec2f,
};

struct DynamicUniforms {
  scale: vec2f,
};

@group(0) @binding(0) var<uniform> statics: StaticUniforms;
@group(0) @binding(1) var<uniform> dynamics: DynamicUniforms;