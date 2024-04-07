struct StaticUniforms {
  color: vec4f,
  offset: vec2f,
};

struct DynamicUniforms {
  scale: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@group(0) @binding(0) var<storage, read> staticStorage: array<StaticUniforms>;
@group(0) @binding(1) var<storage, read> dynamicStorage: array<DynamicUniforms>;