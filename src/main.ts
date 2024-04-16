import compute_billboard from "./shaders/billboard.compute.wgsl";
import compute_movement from "./shaders/movement.compute.wgsl";
import main_vert from "./shaders/main.vert.wgsl";
import main_frag from "./shaders/main.frag.wgsl";
import { getRandomFloat, getRandomInt } from "./utils";
import { Vertex, colorTable } from "./common";

const WIDTH = document.documentElement.clientWidth;
const HEIGHT = document.documentElement.clientHeight;
const NUM_OF_VERTEX_PER_WORKGROUP = 1000;
const NUM_OF_PARTICLE = 256 * NUM_OF_VERTEX_PER_WORKGROUP;
const SPEED = 0.01;

const main = async () => {
  // Initialize
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice()!;
  if (!device) {
    alert("need a browser that supports WebGPU");
    return;
  }

  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const presentationFormat: GPUTextureFormat =
    navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  context.configure({
    device,
    format: presentationFormat,
  });

  // Buffers
  const pointVertices: Vertex[] = [];
  for (let i = 0; i < NUM_OF_PARTICLE; ++i) {
    pointVertices.push({
      position:
        WIDTH > HEIGHT
          ? [
              getRandomFloat(-1.2, 1.2),
              getRandomFloat((-1.2 * WIDTH) / HEIGHT, (1.2 * WIDTH) / HEIGHT),
            ]
          : [
              getRandomFloat((-1.2 * HEIGHT) / WIDTH, (1.2 * HEIGHT) / WIDTH),
              getRandomFloat(-1.2, 1.2),
            ],
      color: colorTable[getRandomInt(0, 6)],
      texCoord: [0, 0],
      speed: getRandomFloat(0.1 * SPEED, 0.5 * SPEED),
    });
  }

  const pointVerticesData: number[] = [];
  for (let i = 0; i < pointVertices.length; ++i) {
    const { position, texCoord, color, speed } = pointVertices[i];
    pointVerticesData.push(
      ...position,
      ...texCoord,
      ...color,
      speed,
      0,
      0,
      0 // padding
    );
  }
  const pointVertexValues = new Float32Array(pointVerticesData);
  const pointVertexBuffer = device.createBuffer({
    label: "point vertex buffer",
    size: pointVertexValues.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(pointVertexBuffer, 0, pointVertexValues);

  const billboardVertexBuffer = device.createBuffer({
    label: "billboard vertex buffer",
    size: pointVertexValues.byteLength * 6,
    usage:
      GPUBufferUsage.VERTEX |
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  const screenUniformBuffer = device.createBuffer({
    label: "screen uniform buffer",
    size: 2 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(
    screenUniformBuffer,
    0,
    new Float32Array([WIDTH, HEIGHT])
  );

  const numOfVertexPerWorkgroupUniformBuffer = device.createBuffer({
    label: "num of vertex per workgroup buffer",
    size: Int32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(
    numOfVertexPerWorkgroupUniformBuffer,
    0,
    new Int32Array([NUM_OF_VERTEX_PER_WORKGROUP])
  );

  const deltaUniformBuffer = device.createBuffer({
    label: "time uniform buffer",
    size: 2 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Pipelines
  const computeMovementPipeline = device.createComputePipeline({
    label: "compute movement pipeline",
    layout: "auto",
    compute: {
      module: device.createShaderModule({
        label: "billboard compute shader",
        code: compute_movement,
      }),
    },
  });

  const computeBillboardPipeline = device.createComputePipeline({
    label: "compute billboard pipeline",
    layout: "auto",
    compute: {
      module: device.createShaderModule({
        label: "billboard compute shader",
        code: compute_billboard,
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
      buffers: [
        {
          arrayStride: (2 + 2 + 4 + 2 + 2) * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            {
              shaderLocation: 0, // location = 0 in vertex shader
              offset: 0,
              format: "float32x2", // position
            },
            {
              shaderLocation: 1, // location = 1 in vertex shader
              offset: 2 * Float32Array.BYTES_PER_ELEMENT,
              format: "float32x2", // texCoord
            },
            {
              shaderLocation: 2, // location = 2 in vertex shader
              offset: 4 * Float32Array.BYTES_PER_ELEMENT,
              format: "float32x4", // color
            },
            {
              shaderLocation: 3, // location = 2 in vertex shader
              offset: 8 * Float32Array.BYTES_PER_ELEMENT,
              format: "float32", // speed
            },
            // padding * 3
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
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "one",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one",
              operation: "add",
            },
          },
        },
      ],
    },

    primitive: {
      topology: "triangle-list",
    },
  });

  // Bind groups
  const computeMovementBindGroup = device.createBindGroup({
    label: "compute movement bind group",
    layout: computeMovementPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: pointVertexBuffer } },
      { binding: 1, resource: { buffer: deltaUniformBuffer } },
      { binding: 2, resource: { buffer: screenUniformBuffer } },
      {
        binding: 3,
        resource: { buffer: numOfVertexPerWorkgroupUniformBuffer },
      },
    ],
  });

  const computeBillboardBindGroup = device.createBindGroup({
    label: "compute billboard bind group",
    layout: computeBillboardPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: pointVertexBuffer } },
      { binding: 1, resource: { buffer: billboardVertexBuffer } },
      { binding: 2, resource: { buffer: screenUniformBuffer } },
      {
        binding: 3,
        resource: { buffer: numOfVertexPerWorkgroupUniformBuffer },
      },
    ],
  });

  let previousFrameTime = 0;
  function render() {
    const time = performance.now();
    const delta: number = time - previousFrameTime;
    previousFrameTime = time;

    device.queue.writeBuffer(deltaUniformBuffer, 0, new Float32Array([delta]));

    const encoder = device.createCommandEncoder({
      label: "encoder",
    });

    const computeMovementPass = encoder.beginComputePass({
      label: "compute movement pass",
    });
    computeMovementPass.setPipeline(computeMovementPipeline);
    computeMovementPass.setBindGroup(0, computeMovementBindGroup);
    computeMovementPass.dispatchWorkgroups(1, 1);
    computeMovementPass.end();

    const computeBillboardPass = encoder.beginComputePass({
      label: "compute billboard pass",
    });
    computeBillboardPass.setPipeline(computeBillboardPipeline);
    computeBillboardPass.setBindGroup(0, computeBillboardBindGroup);
    computeBillboardPass.dispatchWorkgroups(1, 1);
    computeBillboardPass.end();

    const mainPass = encoder.beginRenderPass({
      label: "main pass",
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    mainPass.setPipeline(mainPipeline);
    mainPass.setVertexBuffer(0, billboardVertexBuffer);
    mainPass.draw(NUM_OF_PARTICLE * 6);
    mainPass.end();

    // Finish encoding and submit the commands
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }

  render();
};

main();
