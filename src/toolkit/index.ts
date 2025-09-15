import { ChainswapPlugin, Tool, ToolContext, ToolkitConfig } from '../types.js';
import { ViemManager } from '../clients/viem-manager.js';
import { coreEvmPlugin } from '../plugins/core-evm/index.js';
import { acrossV3Plugin } from '../plugins/across/index.js';

export class ChainswapLangchainToolkit {
  private plugins: ChainswapPlugin[] = [];
  private tools: Record<string, Tool<any, any>> = {};
  private ctx: ToolContext;
  private viem: ViemManager;

  constructor(cfg: ToolkitConfig) {
    this.viem = new ViemManager(cfg.chains);
    const chainMap: ToolContext['chains'] = {};
    for (const c of cfg.chains) {
      chainMap[c.chainName] = {
        publicClient: this.viem.getPublicClient(c.chainName),
        walletClient: c.privateKey ? this.viem.getWalletClient(c.chainName) : undefined,
      };
    }
    this.ctx = {
      mode: cfg.mode,
      chains: chainMap,
      contracts: cfg.contracts || {},
      policy: { requireConfirm: cfg.mode === 'submit' },
      logger: (level, ...args) => console[level]?.('[chainswap-agentkit]', ...args),
    };

    // Built-in plugins
    this.registerPlugin(coreEvmPlugin);
    this.registerPlugin(acrossV3Plugin);
    // Project plugins
    for (const p of cfg.plugins || []) this.registerPlugin(p);
  }

  getContext(): ToolContext { return this.ctx; }

  registerPlugin(plugin: ChainswapPlugin): void {
    this.plugins.push(plugin);
    for (const t of plugin.tools) this.tools[t.name] = t;
    plugin.onInit?.(this.ctx);
  }

  getTools(): Record<string, Tool<any, any>> { return this.tools; }

  dispose(): void { for (const p of this.plugins) p.onDispose?.(); }
}

