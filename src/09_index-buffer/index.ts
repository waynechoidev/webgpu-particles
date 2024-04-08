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

function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 vertices at each subdivision, + 1 to wrap around the circle.
  const numVertices = (numSubdivisions + 1) * 2;
  // 2 32-bit values for position (xy) and 1 32-bit value for color (rgb)
  // The 32-bit color value will be written/read as 4 8-bit values
  const vertexData = new Float32Array(numVertices * (2 + 1));
  const colorData = new Uint8Array(vertexData.buffer);

  let offset = 0;
  let colorOffset = 8;
  const addVertex = (x: number, y: number, color: [number, number, number]) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
    offset += 1; // skip the color
    colorData[colorOffset++] = color[0] * 255;
    colorData[colorOffset++] = color[1] * 255;
    colorData[colorOffset++] = color[2] * 255;
    colorOffset += 9; // skip extra byte and the position
  };

  const innerColor: [number, number, number] = [1, 1, 1];
  const outerColor: [number, number, number] = [0.1, 0.1, 0.1];

  // 2 vertices per subdivision
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i <= numSubdivisions; ++i) {
    const angle =
      startAngle + ((i + 0) * (endAngle - startAngle)) / numSubdivisions;

    const c1 = Math.cos(angle);
    const s1 = Math.sin(angle);

    addVertex(c1 * radius, s1 * radius, outerColor);
    addVertex(c1 * innerRadius, s1 * innerRadius, innerColor);
  }

  const indexData = new Uint32Array(numSubdivisions * 6);
  let ndx = 0;

  // 0---2---4---...
  // | //| //|
  // |// |// |//
  // 1---3-- 5---...
  for (let i = 0; i < numSubdivisions; ++i) {
    const ndxOffset = i * 2;

    // first triangle
    indexData[ndx++] = ndxOffset;
    indexData[ndx++] = ndxOffset + 1;
    indexData[ndx++] = ndxOffset + 2;

    // second triangle
    indexData[ndx++] = ndxOffset + 2;
    indexData[ndx++] = ndxOffset + 1;
    indexData[ndx++] = ndxOffset + 3;
  }

  return {
    vertexData,
    indexData,
    numIndices: indexData.length,
  };
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
      buffers: [
        {
          arrayStride: 2 * 4 + 4, // 2 floats, 4 bytes each + 4 bytes
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" }, // position
            { shaderLocation: 4, offset: 8, format: "unorm8x4" }, // perVertexColor
          ],
        },
        {
          arrayStride: 4 + 2 * 4, // 4 bytes + 2 floats, 4 bytes each
          stepMode: "instance",
          attributes: [
            { shaderLocation: 1, offset: 0, format: "unorm8x4" }, // color
            { shaderLocation: 2, offset: 4, format: "float32x2" }, // offset
          ],
        },
        {
          arrayStride: 2 * 4, // 2 floats, 4 bytes each
          stepMode: "instance",
          attributes: [
            { shaderLocation: 3, offset: 0, format: "float32x2" }, // scale
          ],
        },
      ],
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
  const objectInfos: { scale: number }[] = [];

  // create 2 vertex buffers
  const staticUnitSize =
    4 + // color is 4 bytes
    2 * 4; // offset is 2 32bit floats (4bytes each)
  const changingUnitSize = 2 * 4; // scale is 2 32bit floats (4bytes each)
  const staticVertexBufferSize = staticUnitSize * kNumObjects;
  const changingVertexBufferSize = changingUnitSize * kNumObjects;

  const staticVertexBuffer = device.createBuffer({
    label: "static vertex for objects",
    size: staticVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const changingVertexBuffer = device.createBuffer({
    label: "changing storage for objects",
    size: changingVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kOffsetOffset = 1;

  const kScaleOffset = 0;
  {
    const staticVertexValuesU8 = new Uint8Array(staticVertexBufferSize);
    const staticVertexValuesF32 = new Float32Array(staticVertexValuesU8.buffer);
    for (let i = 0; i < kNumObjects; ++i) {
      const staticOffsetU8 = i * staticUnitSize;
      const staticOffsetF32 = staticOffsetU8 / 4;

      // These are only set once so set them now
      staticVertexValuesU8.set(
        // set the color
        [rand() * 255, rand() * 255, rand() * 255, 255],
        staticOffsetU8 + kColorOffset
      );

      staticVertexValuesF32.set(
        // set the offset
        [rand(-0.9, 0.9), rand(-0.9, 0.9)],
        staticOffsetF32 + kOffsetOffset
      );

      objectInfos.push({
        scale: rand(0.2, 0.5),
      });
    }
    device.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValuesF32);
  }

  // a typed array we can use to update the changingStorageBuffer
  const vertexValues = new Float32Array(changingVertexBufferSize / 4);

  const { vertexData, indexData, numIndices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });
  const vertexBuffer = device.createBuffer({
    label: "vertex buffer",
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);
  const indexBuffer = device.createBuffer({
    label: "index buffer",
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indexData);

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
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setVertexBuffer(1, staticVertexBuffer);
    pass.setVertexBuffer(2, changingVertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint32");

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;

    // set the scales for each object
    objectInfos.forEach(({ scale }, ndx) => {
      const offset = ndx * (changingUnitSize / 4);
      vertexValues.set([scale / aspect, scale], offset + kScaleOffset); // set the scale
    });
    // upload all scales at once
    device.queue.writeBuffer(changingVertexBuffer, 0, vertexValues);

    pass.drawIndexed(numIndices, kNumObjects);

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
