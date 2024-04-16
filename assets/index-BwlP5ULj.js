(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))d(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&d(u)}).observe(document,{childList:!0,subtree:!0});function f(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function d(t){if(t.ep)return;t.ep=!0;const o=f(t);fetch(t.href,o)}})();var w=`struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoord: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) texCoord: vec2f,
  @location(2) color: vec4f,
  @location(3) speed: f32,
};

@group(0) @binding(0) var<storage, read_write> inputVertex: array<Vertex>;
@group(0) @binding(1) var<storage, read_write> outputVertex: array<Vertex>;
@group(0) @binding(2) var<uniform> size: vec2f;
@group(0) @binding(3) var<uniform> numOfVertexPerWorkgroup: i32;

@compute @workgroup_size(256)
fn computeSomething(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let screenRatio = size.x/size.y;
    
    let startIdx = i32(global_invocation_id.x) * numOfVertexPerWorkgroup;
    let endIdx = min(startIdx + numOfVertexPerWorkgroup, 256 * numOfVertexPerWorkgroup);
    let scale:f32 = max(size.x, size.y) * 0.000007;

    var pos = array<vec2f, 6>(
        vec2(-1.0, 1.0 * screenRatio),
        vec2(1.0, 1.0 * screenRatio),
        vec2(-1.0, -1.0 * screenRatio),
        vec2(-1.0, -1.0 * screenRatio),
        vec2(1.0, 1.0 * screenRatio),
        vec2(1.0, -1.0 * screenRatio),
    );

    var tex = array<vec2f, 6>(
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
    );

    for (var idx = startIdx; idx < endIdx; idx++) {
        let input = inputVertex[idx];
        for (var i = 0; i < 6; i++) {
            outputVertex[idx * 6 + i] = Vertex(input.position + pos[i] * scale, tex[i], input.color, input.speed);
        }
    }
}`,M=`struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoord: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) texCoord: vec2f,
  @location(2) color: vec4f,
  @location(3) speed: f32,
};

@group(0) @binding(0) var<storage, read_write> inputVertex: array<Vertex>;
@group(0) @binding(1) var<uniform> delta: f32;
@group(0) @binding(2) var<uniform> size: vec2f;
@group(0) @binding(3) var<uniform> numOfVertexPerWorkgroup: i32;

@compute @workgroup_size(256)
fn computeSomething(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let speedFactor:f32 = 0.1;
    let screenRatio = size.x/size.y;

    let startIdx = i32(global_invocation_id.x) * numOfVertexPerWorkgroup;
    let endIdx = min(startIdx + numOfVertexPerWorkgroup, 256 * numOfVertexPerWorkgroup);

    for (var idx = startIdx; idx < endIdx; idx++) {
        let input = inputVertex[idx];
        let velocity = vec2f(-input.position.y, input.position.x * screenRatio) * input.speed;
        inputVertex[idx] = Vertex(input.position + velocity * speedFactor * delta, input.texCoord, input.color, input.speed);
    }
}`,L=`struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoord: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) texCoord: vec2f,
  @location(2) color: vec4f,
  @location(3) speed: f32,
};

@vertex fn vs(
  input:Vertex
) -> OurVertexShaderOutput { 
  var vsOutput: OurVertexShaderOutput;
  vsOutput.position = vec4f(input.position, 0.0, 1.0);
  vsOutput.color = input.color;
  vsOutput.texCoord = input.texCoord;
  return vsOutput;
}`,I=`struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoord: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) texCoord: vec2f,
  @location(2) color: vec4f,
  @location(3) speed: f32,
};

@fragment fn fs(input: OurVertexShaderOutput) -> @location(0) vec4f {

    let dist:f32 = length(vec2f(0.5, 0.5) - input.texCoord) * 5;
    let scale: f32 = smoothstep(0.0, 1.0, smoothstep(0.25, 0.75, 1.0 - dist));

    return vec4f(input.color.rgb * scale, 1);
}`;const p=(r,e)=>Math.random()*(e-r)+r,A=(r,e)=>Math.floor(Math.random()*(e-r+1))+r,z=[[.8,.2,.2,1],[.8,.5,.2,1],[.8,.8,.2,1],[.2,.8,.2,1],[.2,.2,.8,1],[.4,.2,.4,1],[.4,.2,.8,1]],i=document.documentElement.clientWidth,a=document.documentElement.clientHeight,S=1820,U=256*S,R=.01,N=async()=>{var V;const r=await((V=navigator.gpu)==null?void 0:V.requestAdapter()),e=await(r==null?void 0:r.requestDevice());if(!e){alert("need a browser that supports WebGPU");return}const f=document.querySelector("canvas");f.width=i,f.height=a;const d=navigator.gpu.getPreferredCanvasFormat(),t=f.getContext("webgpu");t.configure({device:e,format:d});const o=[];for(let n=0;n<U;++n)o.push({position:i>a?[p(-1.2,1.2),p(-1.2*i/a,1.2*i/a)]:[p(-1.2*a/i,1.2*a/i),p(-1.2,1.2)],color:z[A(0,6)],texCoord:[0,0],speed:p(.1*R,.5*R)});const u=[];for(let n=0;n<o.length;++n){const{position:P,texCoord:c,color:s,speed:l}=o[n];u.push(...P,...c,...s,l,0,0,0)}const g=new Float32Array(u),v=e.createBuffer({label:"point vertex buffer",size:g.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(v,0,g);const O=e.createBuffer({label:"billboard vertex buffer",size:g.byteLength*6,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),b=e.createBuffer({label:"screen uniform buffer",size:2*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(b,0,new Float32Array([i,a]));const x=e.createBuffer({label:"num of vertex per workgroup buffer",size:Int32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(x,0,new Int32Array([S]));const _=e.createBuffer({label:"time uniform buffer",size:2*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=e.createComputePipeline({label:"compute movement pipeline",layout:"auto",compute:{module:e.createShaderModule({label:"billboard compute shader",code:M})}}),E=e.createComputePipeline({label:"compute billboard pipeline",layout:"auto",compute:{module:e.createShaderModule({label:"billboard compute shader",code:w})}}),C=e.createRenderPipeline({label:"main pipeline",layout:"auto",vertex:{module:e.createShaderModule({label:"main vertex shader",code:L}),buffers:[{arrayStride:12*Float32Array.BYTES_PER_ELEMENT,attributes:[{shaderLocation:0,offset:0,format:"float32x2"},{shaderLocation:1,offset:2*Float32Array.BYTES_PER_ELEMENT,format:"float32x2"},{shaderLocation:2,offset:4*Float32Array.BYTES_PER_ELEMENT,format:"float32x4"},{shaderLocation:3,offset:8*Float32Array.BYTES_PER_ELEMENT,format:"float32"}]}]},fragment:{module:e.createShaderModule({label:"main fragment shader",code:I}),targets:[{format:d,blend:{color:{srcFactor:"one",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"}}),T=e.createBindGroup({label:"compute movement bind group",layout:h.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:v}},{binding:1,resource:{buffer:_}},{binding:2,resource:{buffer:b}},{binding:3,resource:{buffer:x}}]}),F=e.createBindGroup({label:"compute billboard bind group",layout:E.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:v}},{binding:1,resource:{buffer:O}},{binding:2,resource:{buffer:b}},{binding:3,resource:{buffer:x}}]});let B=0;function y(){const n=performance.now(),P=n-B;B=n,e.queue.writeBuffer(_,0,new Float32Array([P]));const c=e.createCommandEncoder({label:"encoder"}),s=c.beginComputePass({label:"compute movement pass"});s.setPipeline(h),s.setBindGroup(0,T),s.dispatchWorkgroups(1,1),s.end();const l=c.beginComputePass({label:"compute billboard pass"});l.setPipeline(E),l.setBindGroup(0,F),l.dispatchWorkgroups(1,1),l.end();const m=c.beginRenderPass({label:"main pass",colorAttachments:[{view:t.getCurrentTexture().createView(),clearValue:[0,0,0,1],loadOp:"clear",storeOp:"store"}]});m.setPipeline(C),m.setVertexBuffer(0,O),m.draw(U*6),m.end();const G=c.finish();e.queue.submit([G]),requestAnimationFrame(y)}y()};N();
