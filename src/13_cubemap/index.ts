import main_vert from "./main.vert.wgsl";
import main_frag from "./main.frag.wgsl";
// @ts-ignore
import { mat4 } from "https://webgpufundamentals.org/3rdparty/wgpu-matrix.module.js";

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

async function createTexture(
  device: GPUDevice,
  img: ImageBitmap,
  maxMipLevel: number
) {
  const mips = await generateMips(img, maxMipLevel);

  const texture = device.createTexture({
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

  return texture;
}

async function createTextureFromImages(
  device: GPUDevice,
  urls: string[],
  maxMipLevel: number
) {
  const images = await Promise.all(urls.map(loadImageBitmap));
  const texture = device.createTexture({
    format: "rgba8unorm",
    mipLevelCount: maxMipLevel + 1,
    size: [images[0].width, images[0].height, images.length],
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  for (let layer = 0; layer < 6; layer++) {
    const mips = await generateMips(images[layer], maxMipLevel);
    mips.forEach((img, mipLevel) => {
      device.queue.copyExternalImageToTexture(
        { source: img },
        { texture: texture, origin: [0, 0, layer], mipLevel: mipLevel },
        { width: img.width, height: img.height }
      );
    });
  }

  return texture;
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
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less-equal",
      format: "depth24plus",
    },
  });

  const texture = await createTextureFromImages(
    device,
    [
      "https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-x.jpg",
      "https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-x.jpg",
      "https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-y.jpg",
      "https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-y.jpg",
      "https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-z.jpg",
      "https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-z.jpg",
    ],
    0
  );

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
  });

  // viewDirectionProjectionInverse
  const uniformBufferSize = 16 * 4;
  const uniformBuffer = device.createBuffer({
    label: "uniforms",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kViewDirectionProjectionInverseOffset = 0;

  const viewDirectionProjectionInverseValue = uniformValues.subarray(
    kViewDirectionProjectionInverseOffset,
    kViewDirectionProjectionInverseOffset + 16
  );

  const bindGroup = device.createBindGroup({
    label: "bind group for object",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView({ dimension: "cube" }) },
    ],
  });

  function render(time: number) {
    time *= 0.001;

    const canvasTexture = context.getCurrentTexture();
    const depthTexture = device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(
      (60 * Math.PI) / 180,
      aspect,
      0.1, // zNear
      10 // zFar
    );
    // Camera going in circle from origin looking at origin
    const cameraPosition = [Math.cos(time * 0.1), 0, Math.sin(time * 0.1)];
    const view = mat4.lookAt(
      cameraPosition,
      [0, 0, 0], // target
      [0, 1, 0] // up
    );
    // We only care about direction so remove the translation
    view[12] = 0;
    view[13] = 0;
    view[14] = 0;

    const viewProjection = mat4.multiply(projection, view);
    mat4.inverse(viewProjection, viewDirectionProjectionInverseValue);

    // upload the uniform values to the uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);

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
      render(0);
    }
  });
  observer.observe(canvas);
};

main();
