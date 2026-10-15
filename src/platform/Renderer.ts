/** CPU WebGL rasterizers stall native-density frames; Canvas keeps this 2D game responsive. */
export function prefersCanvasRenderer(createCanvas:()=>HTMLCanvasElement=()=>document.createElement('canvas')):boolean {
  let gl:WebGLRenderingContext|null=null;
  try {
    gl=createCanvas().getContext('webgl');
    if(!gl)return true;
    const info=gl.getExtension('WEBGL_debug_renderer_info');
    const renderer=String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL??gl.RENDERER));
    // Unknown / privacy-masked devices keep Phaser's existing AUTO selection.
    return /SwiftShader|llvmpipe|softpipe|Software Rasterizer|Microsoft Basic Render Driver/i.test(renderer);
  } catch {
    return false;
  } finally {
    // The probe never owns the game's canvas or context.
    try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* A restricted probe must not block boot. */ }
  }
}
