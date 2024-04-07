import main_vert from "./main.vert.wgsl";
import main_frag from "./main.frag.wgsl";

const rand = (min?: number, max?: number) => {
  if (min === undefined) {
    min = 0;
    max = 1;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.random() * (max - min);
};

const main = async () => {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = (await adapter?.requestDevice()) as GPUDevice;
  if (!device) {
    alert("need a browser that supports WebGPU");
    return;
  }

  const presentationFormat: GPUTextureFormat =
    navigator.gpu.getPreferredCanvasFormat();

  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "main pipeline",
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        label: "main vertex shader",
        code: main_vert,
      }),
    },
    fragment: {
      module: device.createShaderModule({
        label: "main fragment shader",
        code: main_frag,
      }),
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const kNumObjects = 100;

  // create 2 buffers for the uniform values
  const staticStorageUnitSize =
    4 * Float32Array.BYTES_PER_ELEMENT + // 16
    2 * Float32Array.BYTES_PER_ELEMENT + // 8
    2 * Float32Array.BYTES_PER_ELEMENT; // 8 padding
  const dynamicStorageUnitSize = 2 * Float32Array.BYTES_PER_ELEMENT; // 8
  const staticStorageBufferSize = staticStorageUnitSize * kNumObjects;
  const dynamicStorageBufferSize = dynamicStorageUnitSize * kNumObjects;

  const staticStorageBuffer = device.createBuffer({
    label: "static storage for objects",
    size: staticStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const dynamicStorageBuffer = device.createBuffer({
    label: "changing storage for objects",
    size: dynamicStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const staticStorageValues = new Float32Array(
    staticStorageBufferSize / Float32Array.BYTES_PER_ELEMENT
  );
  const dynamicStorageValues = new Float32Array(
    dynamicStorageBufferSize / Float32Array.BYTES_PER_ELEMENT
  );

  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  const objectInfos: {
    scale: number;
  }[] = [];

  for (let i = 0; i < kNumObjects; ++i) {
    const staticOffset =
      i * (staticStorageUnitSize / Float32Array.BYTES_PER_ELEMENT);

    // These are only set once so set them now
    staticStorageValues.set(
      [rand(), rand(), rand(), 1],
      staticOffset + kColorOffset
    ); // set the color
    staticStorageValues.set(
      [rand(-0.9, 0.9), rand(-0.9, 0.9)],
      staticOffset + kOffsetOffset
    ); // set the offset

    objectInfos.push({
      scale: rand(0.2, 0.5),
    });
  }
  device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);

  const bindGroup = device.createBindGroup({
    label: "bind group for objects",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: staticStorageBuffer } },
      { binding: 1, resource: { buffer: dynamicStorageBuffer } },
    ],
  });

  function render() {
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const encoder = device.createCommandEncoder({ label: "our encoder" });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;

    objectInfos.forEach(({ scale }, ndx) => {
      const offset = ndx * (dynamicStorageUnitSize / 4);
      dynamicStorageValues.set([scale / aspect, scale], offset + kScaleOffset); // set the scale
    });
    device.queue.writeBuffer(dynamicStorageBuffer, 0, dynamicStorageValues);

    pass.setBindGroup(0, bindGroup);
    pass.draw(3, kNumObjects); // call our vertex shader 3 times for several instances

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(
        1,
        Math.min(width, device.limits.maxTextureDimension2D)
      );
      canvas.height = Math.max(
        1,
        Math.min(height, device.limits.maxTextureDimension2D)
      );
      render();
    }
  });
  observer.observe(canvas);
};

main();
