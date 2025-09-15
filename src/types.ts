export type ExecMode = 'simulate' | 'returnBytes' | 'submit' | 'autonomous';

export interface ChainConfig {
  chainName: string; // e.g., 'arbitrum', 'base'
  rpcUrl: string;
  privateKey?: string;
}

export interface ContractsConfig {
  [chainName: string]: {
    spokePool?: string; // Across SpokePool
    hubPool?: string;
  };
}

export interface ToolkitConfig {
  mode: ExecMode;
  chains: ChainConfig[];
  contracts?: ContractsConfig;
  plugins?: ChainswapPlugin[];
}

export interface ToolContext {
  mode: ExecMode;
  chains: Record<string, {
    publicClient: any;
    walletClient?: any;
  }>;
  contracts: ContractsConfig;
  policy: {
    requireConfirm: boolean;
    slippageBps?: number;
  };
  logger?: (level: 'debug'|'info'|'warn'|'error', ...args: any[]) => void;
}

export interface Tool<Input = any, Output = any> {
  name: string;
  description: string;
  schema?: unknown;
  execute: (ctx: ToolContext, input: Input) => Promise<Output>;
}

export interface ChainswapPlugin {
  name: string;
  description?: string;
  tools: Tool<any, any>[];
  onInit?: (ctx: ToolContext) => Promise<void> | void;
  onDispose?: () => Promise<void> | void;
}

