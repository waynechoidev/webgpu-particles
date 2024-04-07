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

  // create 2 buffers for the uniform values
  const staticUniformBufferSize =
    4 * Float32Array.BYTES_PER_ELEMENT + // 16
    2 * Float32Array.BYTES_PER_ELEMENT + // 8
    2 * Float32Array.BYTES_PER_ELEMENT; // 8 padding
  const dynamicUniformBufferSize = 2 * Float32Array.BYTES_PER_ELEMENT; // 8

  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  const kNumObjects = 100;
  const objectInfos: {
    scale: number;
    bindGroup: GPUBindGroup;
    dynamicUniformBuffer: GPUBuffer;
    dynamicUniformValues: Float32Array;
  }[] = [];

  for (let i = 0; i < kNumObjects; ++i) {
    const staticUniformBuffer = device.createBuffer({
      label: `uniforms for obj: ${i}`,
      size: staticUniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const staticUniformValues = new Float32Array(
      staticUniformBufferSize / Float32Array.BYTES_PER_ELEMENT
    );
    staticUniformValues.set([rand(), rand(), rand(), 1], kColorOffset); // set the color
    staticUniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset); // set the offset

    // copy these values to the GPU
    device.queue.writeBuffer(staticUniformBuffer, 0, staticUniformValues);

    // create a typedarray to hold the values for the uniforms in JavaScript
    const dynamicUniformValues = new Float32Array(
      dynamicUniformBufferSize / Float32Array.BYTES_PER_ELEMENT
    );
    const dynamicUniformBuffer = device.createBuffer({
      label: `changing uniforms for obj: ${i}`,
      size: dynamicUniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      label: `bind group for obj: ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: staticUniformBuffer } },
        { binding: 1, resource: { buffer: dynamicUniformBuffer } },
      ],
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      dynamicUniformBuffer,
      dynamicUniformValues,
      bindGroup,
    });
  }

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
    for (const {
      scale,
      bindGroup,
      dynamicUniformBuffer,
      dynamicUniformValues,
    } of objectInfos) {
      const aspect = canvas.width / canvas.height;
      dynamicUniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale

      device.queue.writeBuffer(dynamicUniformBuffer, 0, dynamicUniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.draw(3); // call our vertex shader 3 times
    }
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
