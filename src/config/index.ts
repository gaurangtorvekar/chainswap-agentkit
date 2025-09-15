import { ChainswapLangchainToolkit } from '../toolkit/index.js';
import type { ToolkitConfig, ChainswapPlugin } from '../types.js';
import { loadConfig, resolvePlugins } from './loader.js';

export async function createToolkitFromConfig(cwd = process.cwd()): Promise<ChainswapLangchainToolkit> {
  const cfg = await loadConfig(cwd);
  const plugins: ChainswapPlugin[] = cfg.plugins ? await resolvePlugins(cfg.plugins as any, cwd) : [];
  const final: ToolkitConfig = {
    mode: (cfg as any).mode || 'simulate',
    chains: (cfg as any).chains || [],
    contracts: (cfg as any).contracts || {},
    plugins,
  };
  return new ChainswapLangchainToolkit(final);
}

export { loadConfig, resolvePlugins } from './loader.js';

