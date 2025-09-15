import type { ChainswapPlugin } from "../../types.js";
import { SPOKEPOOL_ADDRESSES } from "../../contracts/across/spokePool.js";

function buildHeaders(json = false) {
  const headers: Record<string, string> = {};
  if (json) headers["content-type"] = "application/json";
  if (process.env.ACROSS_API_KEY) headers["authorization"] = `Bearer ${process.env.ACROSS_API_KEY}`;
  if (process.env.ACROSS_INTEGRATOR_ID) headers["x-integrator-id"] = process.env.ACROSS_INTEGRATOR_ID;
  return headers;
}

async function fetchAcrossSwapChains(): Promise<any> {
  const bases = [process.env.ACROSS_CHAINS_URL, "https://app.across.to/api/swap/chains"].filter(Boolean) as string[];
  let lastErr: any;
  for (const url of bases) {
    try {
      const res = await fetch(url as any, { headers: buildHeaders() } as any);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastErr = new Error(`Across chains API error: ${res.status} at ${url} :: ${text}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Across chains API error: no endpoint succeeded");
}

function acrossAppApiBase() {
  return process.env.ACROSS_APP_API_BASE_URL || "https://app.across.to/api";
}

function acrossApiBase() {
  return process.env.ACROSS_API_BASE_URL || "https://api.across.to";
}

async function acrossGet(path: string, params?: Record<string, any>): Promise<any> {
  const base = acrossAppApiBase();
  const url = new URL(base.replace(/\/$/, "") + "/" + path.replace(/^\//, ""));
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: buildHeaders() } as any);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Across API error: ${res.status} ${path} :: ${text}`);
  }
  return await res.json();
}

async function acrossPost(path: string, body?: any): Promise<any> {
  const base = acrossAppApiBase();
  const url = base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
  const res = await fetch(url, { method: "POST", headers: buildHeaders(true), body: body ? JSON.stringify(body) : undefined } as any);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Across API error: ${res.status} ${path} :: ${text}`);
  }
  return await res.json();
}

// Some POST endpoints (e.g., /swap/approval) expect params in the query string.
async function acrossPostQuery(path: string, params?: Record<string, any>): Promise<any> {
  const base = acrossAppApiBase();
  const url = new URL(base.replace(/\/$/, "") + "/" + path.replace(/^\//, ""));
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { method: "POST", headers: buildHeaders() } as any);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Across API error: ${res.status} ${path} :: ${text}`);
  }
  return await res.json();
}

function buildQuotePayload(input: any) {
  const fromChainId = input.fromChainId ?? input.originChainId;
  const toChainId = input.toChainId ?? input.destinationChainId;
  const inputToken = input.inputToken ?? input.originToken;
  const outputToken = input.outputToken ?? input.destinationToken ?? inputToken;
  const inputAmount = input.inputAmount ?? input.amount;
  const recipient = input.recipient;
  if (!fromChainId || !toChainId || !inputToken || !inputAmount || !recipient) {
    throw new Error("Missing required params: fromChainId, toChainId, inputToken, inputAmount, recipient");
  }
  return { fromChainId, toChainId, inputToken, outputToken, inputAmount, recipient };
}

async function callAcrossSwapApi(input: any): Promise<any> {
  const params = buildQuotePayload(input);
  // Use app API per docs for building swap/bridge transactions; allow override via ACROSS_API_URL
  const url = process.env.ACROSS_API_URL || `${acrossAppApiBase().replace(/\/$/, "")}/swap/transactions`;
  const headers = buildHeaders(true);
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(params) } as any);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Across API error: ${res.status} at ${url} :: ${text}`);
  }
  return await res.json();
}

export const acrossV3Plugin: ChainswapPlugin = {
  name: "across-v3",
  description: "Across tools: chains/tokens/sources, suggested-fees quote, limits, available-routes, approval + build+send bridge tx",
  tools: [
    {
      name: "across_supported",
      description: "Supported chains and SpokePool addresses",
      async execute(ctx) {
        const apiChains = await fetchAcrossSwapChains();
        const merged: Record<string, string> = {};
        for (const c of Object.keys(ctx.chains)) {
          const override = ctx.contracts[c]?.spokePool;
          merged[c] = override || SPOKEPOOL_ADDRESSES[c] || "0x0";
        }
        return { spokePools: merged, chains: apiChains };
      },
    },
    {
      name: "across_swap_supported_tokens",
      description: "Get supported tokens for swap operations",
      async execute() {
        return await acrossGet("/swap/tokens");
      },
    },
    {
      name: "across_swap_supported_sources",
      description: "Get supported sources for swap operations",
      async execute() {
        return await acrossGet("/swap/sources");
      },
    },
    {
      name: "across_swap_approval",
      description: "Get swap approval data (tradeType-dependent)",
      async execute(_ctx, params: Record<string, any>) {
        // Reference shows /swap/approval as POST with parameters (query-style).
        return await acrossPostQuery("/swap/approval", params);
      },
    },
    {
      name: "across_suggested_fees",
      description: "Retrieve suggested fee quote for a deposit",
      async execute(_ctx, params: { inputToken: string; outputToken: string; originChainId: number; destinationChainId: number; amount?: string }) {
        return await acrossGet("/suggested-fees", params as any);
      },
    },
    {
      name: "across_limits",
      description: "Retrieve current transfer limits",
      async execute(_ctx, params: { inputToken: string; outputToken: string; originChainId: number; destinationChainId: number }) {
        return await acrossGet("/limits", params as any);
      },
    },
    {
      name: "across_available_routes",
      description: "Retrieve available routes for transfers",
      async execute(_ctx, params: Partial<{ originChainId: number; destinationChainId: number; originToken: string; destinationToken: string }>) {
        return await acrossGet("/available-routes", params as any);
      },
    },
    {
      name: "across_quote",
      description: "Retrieve suggested fee quote using /suggested-fees.",
      async execute(_ctx, params: { inputToken: string; outputToken: string; originChainId: number; destinationChainId: number; amount: string; recipient?: string; message?: `0x${string}` }) {
        return await acrossGet("/suggested-fees", params as any);
      },
    },
    {
      name: "across_deposit_status",
      description: "Track the lifecycle of a deposit",
      async execute(_ctx, params: Partial<{ id: string; txHash: string; depositId: string }>) {
        return await acrossGet("/deposit/status", params as any);
      },
    },
    {
      name: "across_bridge",
      description: "Bridge using SpokePool.depositV3 constructed from suggested-fees quote.",
      async execute(ctx, { originChainId, quote, amount, recipient, message }: { originChainId: number; quote: any; amount: string; recipient?: string; message?: `0x${string}` }) {
        // Build depositV3 call from suggested-fees output
        const ID_TO_NAME: Record<number, string> = { 42161: "arbitrum", 8453: "base" };
        const chainName = ID_TO_NAME[originChainId] || Object.keys(ctx.chains)[0];
        const wallet = ctx.chains[chainName]?.walletClient;
        if (!wallet?.getClient) throw new Error(`No walletClient for chain ${chainName}`);
        const viem = await import("viem").then((m) => m as any);
        const to = quote.spokePoolAddress || ctx.contracts[chainName]?.spokePool;
        if (!to) throw new Error("Missing spokePoolAddress in quote or config");
        const destChainId = quote.outputToken?.chainId || quote.destinationChainId;
        const originToken = quote.inputToken?.address;
        if (!destChainId || !originToken) throw new Error("Missing destinationChainId or originToken from quote");
        if (!amount) throw new Error("Missing required param: amount");

        const pctStr = quote.relayFeePct || quote.totalRelayFee?.pct || "0";
        const relayerFeePct = BigInt(pctStr);
        const quoteTs = Number(quote.timestamp ? Math.floor(Number(quote.timestamp)) : Math.floor(Date.now() / 1000));
        const client = await wallet.getClient();
        const sender = client.account.address;
        const toRecipient = recipient || sender;
        const data = viem.encodeFunctionData({
          abi: [
            {
              type: "function",
              name: "depositV3",
              stateMutability: "payable",
              inputs: [
                { name: "recipient", type: "address" },
                { name: "originToken", type: "address" },
                { name: "amount", type: "uint256" },
                { name: "destinationChainId", type: "uint256" },
                { name: "relayerFeePct", type: "int64" },
                { name: "quoteTimestamp", type: "uint32" },
                { name: "message", type: "bytes" },
              ],
            },
          ] as any,
          functionName: "depositV3",
          args: [toRecipient, originToken, BigInt(amount), BigInt(destChainId), relayerFeePct, quoteTs, message || "0x"],
        });
        if (ctx.mode === "simulate" || ctx.mode === "returnBytes") return { mode: ctx.mode, to, data };
        const hash = await client.sendTransaction({ to: to as any, data });
        return { mode: ctx.mode, txHash: hash };
      },
    },
    {
      name: "across_status",
      description: "Get status for a deposit (stub). Prefer event scan + Across API.",
      async execute(_ctx, { txHash }: { txHash: string }) {
        return { txHash, status: "unknown" };
      },
    },
  ],
};
