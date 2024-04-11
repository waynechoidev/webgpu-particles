import main_vert from "./main.vert.wgsl";
import main_frag from "./main.frag.wgsl";

async function createNextMipLevelRgba8Unorm(
  img: ImageBitmap
): Promise<ImageBitmap> {
  // Compute the size of the next mip
  const dstWidth = Math.max(1, (img.width / 2) | 0);
  const dstHeight = Math.max(1, (img.height / 2) | 0);

  // Create a canvas element to draw the resized image
  const canvas = document.createElement("canvas");
  canvas.width = dstWidth;
  canvas.height = dstHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to get 2D context");
  }

  // Resize the image using canvas
  ctx.drawImage(img, 0, 0, dstWidth, dstHeight);

  // Convert the canvas to ImageBitmap and return
  return createImageBitmap(canvas);
}

async function generateMips(
  src: ImageBitmap,
  maxMipLevels: number
): Promise<ImageBitmap[]> {
  let mip = src;
  const mips: ImageBitmap[] = [mip];
  let currentMipLevel = 0;

  while (mip.width > 1 || mip.height > 1) {
    if (currentMipLevel >= maxMipLevels) {
      break;
    }

    // Create the next mip level asynchronously
    mip = await createNextMipLevelRgba8Unorm(mip);
    mips.push(mip);
    currentMipLevel++;
  }

  return mips;
}

async function loadImageBitmap(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await createImageBitmap(blob, { colorSpaceConversion: "none" });
}

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

  const url =
    "https://webgpufundamentals.org/webgpu/resources/images/f-texture.png";
  const img = await loadImageBitmap(url);
  const mips = await generateMips(img, 5);

  const texture = device.createTexture({
    label: "yellow F on red",
    size: [mips[0].width, mips[0].height],
    mipLevelCount: mips.length,
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  mips.forEach((img, index) => {
    device.queue.copyExternalImageToTexture(
      { source: img, flipY: false },
      { texture: texture, mipLevel: index }, // Set the mip level for each copy operation
      { width: img.width, height: img.height }
    );
  });

  const sampler = device.createSampler();

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() },
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

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6); // call our vertex shader 6 times
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
