import type { ChainswapPlugin } from '../../types.js';
import { ERC20_ABI } from '../../contracts/erc20.js';

export const coreEvmPlugin: ChainswapPlugin = {
  name: 'core-evm',
  description: 'Native ETH and ERC-20 transfers/approvals, basic queries',
  tools: [
    {
      name: 'eth_transfer',
      description: 'Transfer native ETH on a chain',
      async execute(ctx, { chain, to, valueWei }: { chain: string; to: string; valueWei: string }) {
        if (ctx.mode === 'simulate') return { mode: ctx.mode, chain, to, valueWei };
        const wallet = ctx.chains[chain]?.walletClient;
        if (!wallet?.getClient) throw new Error('No walletClient');
        const client = await wallet.getClient();
        if (ctx.mode === 'returnBytes') {
          return { mode: ctx.mode, to, value: BigInt(valueWei), data: '0x' };
        }
        const hash = await client.sendTransaction({ to: to as any, value: BigInt(valueWei) });
        return { mode: ctx.mode, txHash: hash };
      }
    },
    {
      name: 'erc20_approve',
      description: 'Approve ERC-20 allowance',
      async execute(ctx, { chain, token, spender, amountWei }: { chain: string; token: string; spender: string; amountWei: string }) {
        const viem = await import('viem').then(m => (m as any));
        const data = viem.encodeFunctionData({ abi: ERC20_ABI as any, functionName: 'approve', args: [spender, BigInt(amountWei)] });
        if (ctx.mode === 'simulate') return { mode: ctx.mode, chain, to: token, data };
        const wallet = ctx.chains[chain]?.walletClient;
        if (!wallet?.getClient) throw new Error('No walletClient');
        const client = await wallet.getClient();
        if (ctx.mode === 'returnBytes') return { mode: ctx.mode, to: token, data };
        const hash = await client.sendTransaction({ to: token as any, data });
        return { mode: ctx.mode, txHash: hash };
      }
    },
    {
      name: 'erc20_transfer',
      description: 'Transfer ERC-20 tokens',
      async execute(ctx, { chain, token, to, amountWei }: { chain: string; token: string; to: string; amountWei: string }) {
        const viem = await import('viem').then(m => (m as any));
        const data = viem.encodeFunctionData({ abi: ERC20_ABI as any, functionName: 'transfer', args: [to, BigInt(amountWei)] });
        if (ctx.mode === 'simulate') return { mode: ctx.mode, chain, to: token, data };
        const wallet = ctx.chains[chain]?.walletClient;
        if (!wallet?.getClient) throw new Error('No walletClient');
        const client = await wallet.getClient();
        if (ctx.mode === 'returnBytes') return { mode: ctx.mode, to: token, data };
        const hash = await client.sendTransaction({ to: token as any, data });
        return { mode: ctx.mode, txHash: hash };
      }
    },
    {
      name: 'get_eth_balance',
      description: 'Get ETH balance',
      async execute(ctx, { chain, address }: { chain: string; address: string }) {
        const publicWrap = ctx.chains[chain]?.publicClient;
        if (!publicWrap?.getClient) throw new Error('No publicClient');
        const client = await publicWrap.getClient();
        const viem = await import('viem').then(m => (m as any));
        const balance = await client.getBalance({ address: viem.getAddress(address) });
        return balance.toString();
      }
    },
    {
      name: 'get_erc20_balance',
      description: 'Get ERC-20 balanceOf',
      async execute(ctx, { chain, token, address }: { chain: string; token: string; address: string }) {
        const publicWrap = ctx.chains[chain]?.publicClient;
        if (!publicWrap?.getClient) throw new Error('No publicClient');
        const client = await publicWrap.getClient();
        const viem = await import('viem').then(m => (m as any));
        const res = await client.readContract({ address: token as any, abi: ERC20_ABI as any, functionName: 'balanceOf', args: [viem.getAddress(address)] });
        return (res as bigint).toString();
      }
    },
    {
      name: 'get_allowance',
      description: 'Get ERC-20 allowance',
      async execute(ctx, { chain, token, owner, spender }: { chain: string; token: string; owner: string; spender: string }) {
        const publicWrap = ctx.chains[chain]?.publicClient;
        if (!publicWrap?.getClient) throw new Error('No publicClient');
        const client = await publicWrap.getClient();
        const viem = await import('viem').then(m => (m as any));
        const res = await client.readContract({ address: token as any, abi: ERC20_ABI as any, functionName: 'allowance', args: [viem.getAddress(owner), viem.getAddress(spender)] });
        return (res as bigint).toString();
      }
    },
  ]
};

