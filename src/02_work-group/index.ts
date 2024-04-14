// This example was adapted from WebGPU Fundamentals.
// However, while the original code used template literals
// to dynamically allocate the workgroup size and dispatch
// count, I chose to hardcode these values as I do not
// believe that to be best practice.
// work group size: 2, 3, 4
// dispatch count: 4, 3, 2

import main_compute from "./main.compute.wgsl";

const main = async () => {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice()!;
  if (!device) {
    alert("need a browser that supports WebGPU");
    return;
  }

  const pipeline = device.createComputePipeline({
    label: "doubling compute pipeline",
    layout: "auto",
    compute: {
      module: device.createShaderModule({
        label: "main compute shader",
        code: main_compute,
      }),
    },
  });

  const numWorkgroups = 2 * 3 * 4;
  const numThreadsPerWorkgroup = 4 * 3 * 2;
  const numResults = numWorkgroups * numThreadsPerWorkgroup;
  const size = numResults * 4 * 4; // vec3f * u32

  let usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  const workgroupBuffer = device.createBuffer({ size, usage });
  const localBuffer = device.createBuffer({ size, usage });
  const globalBuffer = device.createBuffer({ size, usage });

  usage = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
  const workgroupReadBuffer = device.createBuffer({ size, usage });
  const localReadBuffer = device.createBuffer({ size, usage });
  const globalReadBuffer = device.createBuffer({ size, usage });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: workgroupBuffer } },
      { binding: 1, resource: { buffer: localBuffer } },
      { binding: 2, resource: { buffer: globalBuffer } },
    ],
  });

  // Encode commands to do the computation
  const encoder = device.createCommandEncoder({
    label: "main compute encoder",
  });
  const pass = encoder.beginComputePass({
    label: "main compute pass",
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(4, 3, 2);
  pass.end();

  encoder.copyBufferToBuffer(workgroupBuffer, 0, workgroupReadBuffer, 0, size);
  encoder.copyBufferToBuffer(localBuffer, 0, localReadBuffer, 0, size);
  encoder.copyBufferToBuffer(globalBuffer, 0, globalReadBuffer, 0, size);

  // Finish encoding and submit the commands
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  // Read the results
  await Promise.all([
    workgroupReadBuffer.mapAsync(GPUMapMode.READ),
    localReadBuffer.mapAsync(GPUMapMode.READ),
    globalReadBuffer.mapAsync(GPUMapMode.READ),
  ]);

  const workgroup = new Uint32Array(workgroupReadBuffer.getMappedRange());
  const local = new Uint32Array(localReadBuffer.getMappedRange());
  const global = new Uint32Array(globalReadBuffer.getMappedRange());

  const get3 = (arr: Uint32Array, i: number) => {
    const off = i * 4;
    return `${arr[off]}, ${arr[off + 1]}, ${arr[off + 2]}`;
  };

  for (let i = 0; i < numResults; ++i) {
    if (i % numThreadsPerWorkgroup === 0) {
      console.log(`\
---------------------------------------
global                 local     global   dispatch: ${
        i / numThreadsPerWorkgroup
      }
invoc.    workgroup    invoc.    invoc.
index     id           id        id
---------------------------------------`);
    }
    console.log(
      `${i.toString().padStart(3)}:      ${get3(workgroup, i)}      ${get3(
        local,
        i
      )}   ${get3(global, i)}`
    );
  }
};

main();
