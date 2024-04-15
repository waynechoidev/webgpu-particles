import main_compute from "./main.compute.wgsl";
import main_vert from "./main.vert.wgsl";
import main_frag from "./main.frag.wgsl";

const imgSize = [400, 300];
const workgroup = [16, 16];

const main = async () => {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice()!;
  if (!device) {
    alert("need a browser that supports WebGPU");
    return;
  }

  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  canvas.style.width = `${imgSize[0]}px`;
  canvas.style.height = `${imgSize[1]}px`;
  // canvas.width = WIDTH;
  // canvas.height = HEIGHT;

  const presentationFormat: GPUTextureFormat =
    navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  context.configure({
    device,
    format: presentationFormat,
  });

  const computePipeline = device.createComputePipeline({
    label: "compute pipeline",
    layout: "auto",
    compute: {
      module: device.createShaderModule({
        label: "compute shader",
        code: main_compute,
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
  const texture = device.createTexture({
    label: "texture",
    size: imgSize,
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
  const computeBindGroup = device.createBindGroup({
    label: "bindGroup for work buffer",
    layout: computePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: texture.createView() }],
  });
  const mainBindGroup = device.createBindGroup({
    label: "bindGroup for work buffer",
    layout: mainPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() },
    ],
  });

  // Encode commands to do the computation
  const encoder = device.createCommandEncoder({
    label: "encoder",
  });
  const computePass = encoder.beginComputePass({
    label: "computcompute pass",
  });
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, computeBindGroup);
  computePass.dispatchWorkgroups(
    Math.ceil(imgSize[0] / workgroup[0]),
    Math.ceil(imgSize[1] / workgroup[1])
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
