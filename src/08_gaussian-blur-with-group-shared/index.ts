import main_vert from "./main.vert.wgsl";
import main_frag from "./main.frag.wgsl";
import compute_x from "./compute-x.wgsl";
import compute_y from "./compute-y.wgsl";
import { loadImageBitmap } from "../utils";

const main = async () => {
  const url = "img.jpg";
  const img = await loadImageBitmap(url);

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice()!;
  if (!device) {
    alert("need a browser that supports WebGPU");
    return;
  }

  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  canvas.style.width = "400px";
  canvas.style.height = "300px";
  canvas.width = img.width;
  canvas.height = img.height;

  const presentationFormat: GPUTextureFormat =
    navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  context.configure({
    device,
    format: presentationFormat,
  });

  const computeXPipeline = device.createComputePipeline({
    label: "compute X pipeline",
    layout: "auto",
    compute: {
      module: device.createShaderModule({
        label: "compute shader",
        code: compute_x,
      }),
    },
  });

  const computeYPipeline = device.createComputePipeline({
    label: "compute Y pipeline",
    layout: "auto",
    compute: {
      module: device.createShaderModule({
        label: "compute shader",
        code: compute_y,
      }),
    },
  });

  const mainPipeline: GPURenderPipeline = device.createRenderPipeline({
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

  // input and output
  const inputTexture = device.createTexture({
    label: "texture",
    size: [img.width, img.height],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: img, flipY: false },
    { texture: inputTexture },
    { width: img.width, height: img.height }
  );

  const tempTexture = device.createTexture({
    label: "texture",
    size: [img.width, img.height],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.STORAGE_BINDING,
  });

  const outputTexture = device.createTexture({
    label: "texture",
    size: [img.width, img.height],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.STORAGE_BINDING,
  });

  const sampler = device.createSampler();

  // Setup a bindGroup to tell the shader which
  // buffer to use for the computation
  const computeXBindGroup = device.createBindGroup({
    label: "bindGroup for work buffer",
    layout: computeXPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: inputTexture.createView() },
      { binding: 1, resource: tempTexture.createView() },
    ],
  });
  const computeYBindGroup = device.createBindGroup({
    label: "bindGroup for work buffer",
    layout: computeYPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: tempTexture.createView() },
      { binding: 1, resource: outputTexture.createView() },
    ],
  });
  const mainBindGroup = device.createBindGroup({
    label: "bindGroup for work buffer",
    layout: mainPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: outputTexture.createView() },
    ],
  });

  // Encode commands to do the computation
  const encoder = device.createCommandEncoder({
    label: "encoder",
  });
  const computePass = encoder.beginComputePass({
    label: "computcompute pass",
  });
  computePass.setPipeline(computeXPipeline);
  computePass.setBindGroup(0, computeXBindGroup);
  computePass.dispatchWorkgroups(
    Math.ceil(img.width / 256),
    Math.ceil(img.height / 1)
  );

  computePass.setPipeline(computeYPipeline);
  computePass.setBindGroup(0, computeYBindGroup);
  computePass.dispatchWorkgroups(
    Math.ceil(img.width / 1),
    Math.ceil(img.height / 256)
  );
  computePass.end();

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "main pass",
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };
  const mainPass = encoder.beginRenderPass(renderPassDescriptor);

  mainPass.setPipeline(mainPipeline);
  mainPass.setBindGroup(0, mainBindGroup);
  mainPass.draw(6);
  mainPass.end();

  // Finish encoding and submit the commands
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
};

main();
