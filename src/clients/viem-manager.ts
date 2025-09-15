import type { ChainConfig } from '../types.js';

type InternalChain = ChainConfig;

export class ViemManager {
  private chains: Record<string, InternalChain> = {};
  private viem: any | null = null;

  constructor(cfgs: InternalChain[]) {
    for (const c of cfgs) this.chains[c.chainName] = c;
  }

  private async ensureViem() {
    if (this.viem) return;
    try {
      const mod = await import('viem');
      const accounts = await import('viem/accounts').catch(() => ({}));
      this.viem = { ...mod, ...accounts };
    } catch {
      this.viem = null;
    }
  }

  getPublicClient(chain: string): any {
    const cfg = this.chains[chain];
    return {
      chain,
      rpcUrl: cfg?.rpcUrl,
      async getClient() {
        const mgr = new ViemManager([cfg]);
        await (mgr as any).ensureViem();
        const v = (mgr as any).viem;
        if (!v) return { rpcUrl: cfg?.rpcUrl };
        return v.createPublicClient({ transport: v.http(cfg.rpcUrl) });
      }
    };
  }

  getWalletClient(chain: string): any {
    const cfg = this.chains[chain];
    if (!cfg?.privateKey || !cfg?.rpcUrl) return undefined;
    return {
      chain,
      rpcUrl: cfg.rpcUrl,
      privateKey: cfg.privateKey,
      async getClient() {
        const mgr = new ViemManager([cfg]);
        await (mgr as any).ensureViem();
        const v = (mgr as any).viem;
        if (!v) return { rpcUrl: cfg.rpcUrl, privateKey: cfg.privateKey };
        const account = v.privateKeyToAccount ? v.privateKeyToAccount(cfg.privateKey as any) : undefined;
        return v.createWalletClient({ account, transport: v.http(cfg.rpcUrl) });
      }
    };
  }
}

