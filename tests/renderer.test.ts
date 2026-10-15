import {describe,expect,it,vi} from 'vitest';
import {prefersCanvasRenderer} from '../src/platform/Renderer';

function device(renderer:string,debug=true) {
  const loseContext=vi.fn();
  const gl={RENDERER:1,getParameter:vi.fn(()=>renderer),getExtension:vi.fn((name:string)=>name==='WEBGL_lose_context'?{loseContext}:debug?{UNMASKED_RENDERER_WEBGL:2}:null)};
  const createCanvas=()=>({getContext:()=>gl}) as unknown as HTMLCanvasElement;
  return {createCanvas,loseContext,gl};
}
describe('renderer selection',()=>{
  it.each(['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)','llvmpipe (LLVM 15.0.7, 256 bits)','softpipe','Software Rasterizer','Microsoft Basic Render Driver'])('uses Canvas for explicit CPU renderer %s',renderer=>{
    const d=device(renderer);expect(prefersCanvasRenderer(d.createCanvas)).toBe(true);expect(d.loseContext).toHaveBeenCalledOnce();
  });
  it.each(['ANGLE (Apple, ANGLE Metal Renderer: Apple M3)','ANGLE (Intel, Mesa Intel(R) UHD Graphics 620)','Adreno (TM) 740','Mali-G78','WebKit WebGL'])('preserves AUTO for hardware or masked renderer %s',renderer=>{
    const d=device(renderer);expect(prefersCanvasRenderer(d.createCanvas)).toBe(false);expect(d.loseContext).toHaveBeenCalledOnce();
  });
  it('keeps AUTO when renderer details are hidden',()=>{
    const d=device('WebKit WebGL',false);expect(prefersCanvasRenderer(d.createCanvas)).toBe(false);expect(d.gl.getParameter).toHaveBeenCalledWith(d.gl.RENDERER);
  });
  it('uses Canvas when WebGL is unavailable',()=>{
    expect(prefersCanvasRenderer(()=>({getContext:()=>null}) as unknown as HTMLCanvasElement)).toBe(true);
  });
  it('preserves AUTO and releases the probe if inspection throws',()=>{
    const d=device('');d.gl.getParameter.mockImplementation(()=>{throw Error('restricted');});
    expect(prefersCanvasRenderer(d.createCanvas)).toBe(false);expect(d.loseContext).toHaveBeenCalledOnce();
  });
  it('does not block boot when context extensions are restricted',()=>{
    const d=device('');d.gl.getExtension.mockImplementation(()=>{throw Error('restricted');});
    expect(prefersCanvasRenderer(d.createCanvas)).toBe(false);
  });
});
