import main_vert from "./main.vert.wgsl";
import main_frag from "./main.frag.wgsl";

type Mip = {
  data: Uint8Array;
  width: number;
  height: number;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const mix = (a: number[], b: number[], t: number): number[] =>
  a.map((v, i) => lerp(v, b[i], t));
const bilinearFilter = (
  tl: number[],
  tr: number[],
  bl: number[],
  br: number[],
  t1: number,
  t2: number
): number[] => {
  const t = mix(tl, tr, t1);
  const b = mix(bl, br, t1);
  return mix(t, b, t2);
};

const createNextMipLevelRgba8Unorm = (mip: Mip): Mip => {
  // compute the size of the next mip
  const dstWidth = Math.max(1, (mip.width / 2) | 0);
  const dstHeight = Math.max(1, (mip.height / 2) | 0);
  const dst = new Uint8Array(dstWidth * dstHeight * 4);

  const getSrcPixel = (x: number, y: number): number[] => {
    const offset = (y * mip.width + x) * 4;
    return [
      mip.data[offset],
      mip.data[offset + 1],
      mip.data[offset + 2],
      mip.data[offset + 3],
    ];
  };

  for (let y = 0; y < dstHeight; ++y) {
    for (let x = 0; x < dstWidth; ++x) {
      // compute texcoord of the center of the destination texel
      const u = (x + 0.5) / dstWidth;
      const v = (y + 0.5) / dstHeight;

      // compute the same texcoord in the source - 0.5 a pixel
      const au = u * mip.width - 0.5;
      const av = v * mip.height - 0.5;

      // compute the src top left texel coord (not texcoord)
      const tx = au | 0;
      const ty = av | 0;

      // compute the mix amounts between pixels
      const t1 = au % 1;
      const t2 = av % 1;

      // get the 4 pixels
      const tl = getSrcPixel(tx, ty);
      const tr = getSrcPixel(tx + 1, ty);
      const bl = getSrcPixel(tx, ty + 1);
      const br = getSrcPixel(tx + 1, ty + 1);

      // copy the "sampled" result into the dest.
      const dstOffset = (y * dstWidth + x) * 4;
      dst.set(bilinearFilter(tl, tr, bl, br, t1, t2), dstOffset);
    }
  }
  return { data: dst, width: dstWidth, height: dstHeight };
};

const generateMips = (
  src: Uint8Array,
  srcWidth: number,
  maxMipLevels: number
): Mip[] => {
  const srcHeight = src.length / 4 / srcWidth;

  // populate with first mip level (base level)
  let mip: Mip = { data: src, width: srcWidth, height: srcHeight };
  const mips: Mip[] = [mip];

  let currentMipLevel = 0;
  while (mip.width > 1 || mip.height > 1) {
    if (currentMipLevel >= maxMipLevels) {
      break;
    }
    mip = createNextMipLevelRgba8Unorm(mip);
    mips.push(mip);
    currentMipLevel++;
  }
  return mips;
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

  // Textures

  const kTextureWidth = 5;
  const _ = [255, 0, 0, 255]; // red
  const y = [255, 255, 0, 255]; // yellow
  const b = [0, 0, 255, 255]; // blue
  const textureData = new Uint8Array(
    [
      b,
      _,
      _,
      _,
      _,
      _,
      y,
      y,
      y,
      _,
      _,
      y,
      _,
      _,
      _,
      _,
      y,
      y,
      _,
      _,
      _,
      y,
      _,
      _,
      _,
      _,
      y,
      _,
      _,
      _,
      _,
      _,
      _,
      _,
      _,
    ].flat()
  );

  const mips = generateMips(textureData, kTextureWidth, 2);

  const texture = device.createTexture({
    label: "yellow F on red",
    size: [mips[0].width, mips[0].height],
    mipLevelCount: mips.length,
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  mips.forEach(({ data, width, height }, mipLevel) => {
    device.queue.writeTexture(
      { texture, mipLevel },
      data,
      { bytesPerRow: width * 4 },
      { width, height }
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
