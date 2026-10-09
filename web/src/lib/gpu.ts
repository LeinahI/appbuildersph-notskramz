/**
 * Whether this phone's GPU can run a model through WebGPU. Works in the page and in workers.
 *
 * Gemma needs the GPU: every quantized version of its embedding layer (q4, q4f16, uint8) uses GatherBlockQuantized,
 * which the browser runtime has only on WebGPU, not on the CPU (WebAssembly). The CPU-only versions are 5.5 GB (fp16)
 * and 11 GB (fp32), too big for a phone. Laya (fp32) runs on the GPU or the CPU.
 *
 * Having WebGPU is not enough. The GPU must hold the model's largest weight in one buffer and bind it whole, and for
 * 16-bit weights it needs 16-bit shaders. An entry-level phone GPU (Realme C67, Adreno 610: 1 GB buffers, 128 MB
 * bindings, no shader-f16; checked 2026-10-10) cannot take Gemma's 1.17 GB per-layer embedding table.
 */
export interface GpuNeeds {
  /** The weights are 16-bit (q4f16), so the GPU needs shader-f16. */
  f16: boolean;
  /** The model's largest single weight, in bytes. */
  largestWeight: number;
}

type Adapter = { features: Set<string>; limits: { maxBufferSize: number; maxStorageBufferBindingSize: number } };

export async function canUseWebGpu(needs: GpuNeeds): Promise<boolean> {
  try {
    const gpu = (globalThis.navigator as { gpu?: { requestAdapter(o?: object): Promise<Adapter | null> } } | undefined)?.gpu;
    const adapter = gpu ? await gpu.requestAdapter({ powerPreference: 'high-performance' }) : null;
    if (!adapter) return false;
    if (needs.f16 && !adapter.features.has('shader-f16')) return false;
    return adapter.limits.maxBufferSize >= needs.largestWeight && adapter.limits.maxStorageBufferBindingSize >= needs.largestWeight;
  } catch {
    return false;
  }
}

/** The message a phone whose GPU cannot run the AI gets. The offline notes still work. */
export const NO_GPU_MESSAGE =
  'Hindi kaya ng GPU ng cellphone na ito ang Ugatan AI (kailangan ng WebGPU at mas malakas na GPU). Gagana pa rin ang offline na gabay.';
