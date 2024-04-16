(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))l(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&l(i)}).observe(document,{childList:!0,subtree:!0});function s(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function l(t){if(t.ep)return;t.ep=!0;const o=s(t);fetch(t.href,o)}})();var G=`struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoord: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) texCoord: vec2f,
  @location(2) color: vec4f,
  @location(3) velocity: vec2f,
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
    let scale:f32 = 0.05;

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
            outputVertex[idx * 6 + i] = Vertex(input.position + pos[i] * scale, tex[i], input.color, input.velocity);
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
  @location(3) velocity: vec2f,
};

@group(0) @binding(0) var<storage, read_write> inputVertex: array<Vertex>;
@group(0) @binding(1) var<uniform> delta: f32;
@group(0) @binding(2) var<uniform> numOfVertexPerWorkgroup: i32;

fn euclideanModulo(n: f32, m: f32) -> f32 {
    var res = n - m * floor(n / m);
    if (res < 0.0) {
        res += m;
    }
    return res;
}

fn wrapAround(n: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        euclideanModulo(n.x + 1.0, 2.0) - 1.0,
        euclideanModulo(n.y + 1.0, 2.0) - 1.0
    );
}

@compute @workgroup_size(256)
fn computeSomething(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
) {
    let speedFactor:f32 = 0.01;
    
    let startIdx = i32(global_invocation_id.x) * numOfVertexPerWorkgroup;
    let endIdx = min(startIdx + numOfVertexPerWorkgroup, 256 * numOfVertexPerWorkgroup);

    for (var idx = startIdx; idx < endIdx; idx++) {
        let input = inputVertex[idx];
        let newPosition = wrapAround(input.position + input.velocity * speedFactor * delta);
        inputVertex[idx] = Vertex(newPosition, input.texCoord, input.color, input.velocity);
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
  @location(3) velocity: vec2f,
};

@vertex fn vs(
  input:Vertex
) -> OurVertexShaderOutput { 
  var vsOutput: OurVertexShaderOutput;
  vsOutput.position = vec4f(input.position, 0.0, 1.0);
  vsOutput.color = input.color;
  vsOutput.texCoord = input.texCoord;
  return vsOutput;
}`,A=`struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoord: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) texCoord: vec2f,
  @location(2) color: vec4f,
  @location(3) velocity: vec2f,
};

@fragment fn fs(input: OurVertexShaderOutput) -> @location(0) vec4f {

    let dist:f32 = length(vec2f(0.5, 0.5) - input.texCoord) * 5;
    let scale: f32 = smoothstep(0.0, 1.0, smoothstep(0.25, 0.75, 1.0 - dist));

    return vec4f(input.color.rgb * scale, 1);
}`;const d=(n,e)=>Math.random()*(e-n)+n,I=(n,e)=>Math.floor(Math.random()*(e-n+1))+n,N=[[.8,.2,.2,.5],[.8,.5,.2,.5],[.8,.8,.2,.5],[.2,.8,.2,.5],[.2,.2,.8,.5],[.4,.2,.4,.5],[.4,.2,.8,.5]],V=document.documentElement.clientWidth,U=document.documentElement.clientHeight,C=10,S=256*C,p=.01,W=async()=>{var B;const n=await((B=navigator.gpu)==null?void 0:B.requestAdapter()),e=await(n==null?void 0:n.requestDevice());if(!e){alert("need a browser that supports WebGPU");return}const s=document.querySelector("canvas");s.width=V,s.height=U;const l=navigator.gpu.getPreferredCanvasFormat(),t=s.getContext("webgpu");t.configure({device:e,format:l});const o=[];for(let r=0;r<S;++r)o.push({position:[d(-1,1),d(-1,1)],color:N[I(0,6)],texCoord:[0,0],velocity:[d(-1*p,1*p),d(-1*p,1*p)]});const i=[];for(let r=0;r<o.length;++r){const{position:b,texCoord:a,color:u,velocity:c}=o[r];i.push(...b,...a,...u,...c,0,0)}const m=new Float32Array(i),v=e.createBuffer({label:"point vertex buffer",size:m.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(v,0,m);const x=e.createBuffer({label:"billboard vertex buffer",size:m.byteLength*6,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),P=e.createBuffer({label:"screen uniform buffer",size:2*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(P,0,new Float32Array([V,U]));const g=e.createBuffer({label:"num of vertex per workgroup buffer",size:Int32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(g,0,new Int32Array([C]));const O=e.createBuffer({label:"time uniform buffer",size:2*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),_=e.createComputePipeline({label:"compute movement pipeline",layout:"auto",compute:{module:e.createShaderModule({label:"billboard compute shader",code:M})}}),h=e.createComputePipeline({label:"compute billboard pipeline",layout:"auto",compute:{module:e.createShaderModule({label:"billboard compute shader",code:G})}}),R=e.createRenderPipeline({label:"main pipeline",layout:"auto",vertex:{module:e.createShaderModule({label:"main vertex shader",code:L}),buffers:[{arrayStride:12*Float32Array.BYTES_PER_ELEMENT,attributes:[{shaderLocation:0,offset:0,format:"float32x2"},{shaderLocation:1,offset:2*Float32Array.BYTES_PER_ELEMENT,format:"float32x2"},{shaderLocation:2,offset:4*Float32Array.BYTES_PER_ELEMENT,format:"float32x4"},{shaderLocation:3,offset:8*Float32Array.BYTES_PER_ELEMENT,format:"float32x2"}]}]},fragment:{module:e.createShaderModule({label:"main fragment shader",code:A}),targets:[{format:l,blend:{color:{srcFactor:"one",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"}}),T=e.createBindGroup({label:"compute movement bind group",layout:_.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:v}},{binding:1,resource:{buffer:O}},{binding:2,resource:{buffer:g}}]}),w=e.createBindGroup({label:"compute billboard bind group",layout:h.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:v}},{binding:1,resource:{buffer:x}},{binding:2,resource:{buffer:P}},{binding:3,resource:{buffer:g}}]});let y=0;function E(){const r=performance.now(),b=r-y;y=r,e.queue.writeBuffer(O,0,new Float32Array([b]));const a=e.createCommandEncoder({label:"encoder"}),u=a.beginComputePass({label:"compute movement pass"});u.setPipeline(_),u.setBindGroup(0,T),u.dispatchWorkgroups(1,1),u.end();const c=a.beginComputePass({label:"compute billboard pass"});c.setPipeline(h),c.setBindGroup(0,w),c.dispatchWorkgroups(1,1),c.end();const f=a.beginRenderPass({label:"main pass",colorAttachments:[{view:t.getCurrentTexture().createView(),clearValue:[0,0,0,1],loadOp:"clear",storeOp:"store"}]});f.setPipeline(R),f.setVertexBuffer(0,x),f.draw(S*6),f.end();const F=a.finish();e.queue.submit([F]),requestAnimationFrame(E)}E()};W();
