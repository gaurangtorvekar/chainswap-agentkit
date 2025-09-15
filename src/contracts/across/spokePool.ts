// Across v3 SpokePool (partial) — verify against official docs before production use
export const SpokePoolV3_ABI = [
  {
    type: 'function',
    name: 'depositV3',
    stateMutability: 'payable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'originToken', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'destinationChainId', type: 'uint256' },
      { name: 'relayerFeePct', type: 'int64' },
      { name: 'quoteTimestamp', type: 'uint32' },
      { name: 'message', type: 'bytes' }
    ],
    outputs: []
  },
] as const;

export const SPOKEPOOL_ADDRESSES: Record<string, string> = {
  // Fill with official v3 spoke pool addresses
  arbitrum: '0x0000000000000000000000000000000000000000',
  base: '0x0000000000000000000000000000000000000000',
};

