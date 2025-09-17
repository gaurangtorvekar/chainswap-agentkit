# Chainswap Agent Kit

![npm version](https://badgen.net/npm/v/chainswap-agentkit)
![license](https://badgen.net/github/license/g-tor/chainswap-agentkit)
![build](https://badgen.net/github/checks/g-tor/chainswap-agentkit)

> Build EVM-powered AI agents for cross-chain swaps and other operations.

## 📋 Contents

- [Key Features](#key-features)
- [About the Agent Kit Functionality](#agent-kit-functionality)
- [Developer Examples](#developer-examples)
- [🚀 60-Second Quick-Start](#-60-second-quick-start)
- [Agent Execution Modes](#agent-execution-modes)
- [Plugins & Tools](#plugins--tools)
- [License](#license)

---

## Key Features

This Agent Kit is designed to be flexible and easy to use, with a focus on developer experience. It enables direct API execution through a simple `ChainswapLangchainToolkit` class, which can be used to power AI agents.

The Chainswap Agent Kit is extensible with third party plugins by other projects.

---

## Agent Kit Functionality

The list of currently available plugins and functionality can be found in the [Plugins & Tools section](#plugins--tools) of this page.

---

## Developer Examples

You can try out examples of the different types of agents you can build by looking at the `chainswap-test-app` in this repository.

---

## 🚀 60-Second Quick-Start

### 1 – Project Setup

Create a directory for your project and install dependencies:

```bash
mkdir hello-chainswap-agent
cd hello-chainswap-agent
npm init -y
npm install chainswap-agentkit langchain @langchain/openai dotenv
```

### 2 – Configure: Add Environment Variables

Create an `.env` file in the root directory of your project:

```bash
touch .env
```

Add the following to the .env file:

```env
# Required: EVM private key and RPC URLs for the chains you want to use
PRIVATE_KEY="0x..."
ARBITRUM_RPC="https://arb1.arbitrum.io/rpc"
BASE_RPC="https://mainnet.base.org"

# Optional: OpenAI API Key for the AI agent
OPENAI_API_KEY="sk-..."
```

### 3 – Simple "Hello Chainswap Agent Kit" Example

Create a a new file called `index.js` in the `hello-chainswap-agent` folder.

```bash
touch index.js
```

Once you have created a new file `index.js` and added the environment variables, you can run the following code:

```javascript
// index.js
import "dotenv/config";
import { ChainswapLangchainToolkit } from "chainswap-agentkit";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

async function main() {
  const kit = new ChainswapLangchainToolkit({
    mode: "autonomous",
    chains: [
      { chainName: "arbitrum", rpcUrl: process.env.ARBITRUM_RPC, privateKey: process.env.PRIVATE_KEY },
      { chainName: "base", rpcUrl: process.env.BASE_RPC, privateKey: process.env.PRIVATE_KEY },
    ],
  });

  const tools = kit.getTools();

  const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant"],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  const response = await agentExecutor.invoke({ input: "what's my ETH balance on arbitrum?" });
  console.log(response);
}

main().catch(console.error);
```

### 4 – Run Your "Hello Chainswap Agent Kit" Example

From the root directory, run your example agent:

```bash
node index.js
```

---

## About the Agent Kit

### Agent Execution Modes

This tool has two execution modes with AI agents; `autonomous` and `returnBytes`.

- `mode: 'returnBytes'` the transaction will not be executed, and the bytes to execute the transaction will be returned.
- `mode: 'autonomous'` the transaction will be executed autonomously, using the private key provided.

### Plugins & Tools

The Chainswap Agent Kit provides a set of tools, bundled into plugins, to interact with EVM chains.

#### Core EVM Plugin

- `eth_transfer`: Transfer native ETH.
- `erc20_approve`: Approve ERC-20 spending.
- `erc20_transfer`: Transfer ERC-20 tokens.
- `get_eth_balance`: Get native ETH balance.
- `get_erc20_balance`: Get ERC-20 token balance.
- `get_allowance`: Get ERC-20 allowance.

#### Across V3 Plugin

- `across_supported`: Get supported chains and SpokePool addresses.
- `across_swap_supported_tokens`: Get supported tokens for swaps.
- `across_swap_supported_sources`: Get supported sources for swaps.
- `across_swap_approval`: Get swap approval data.
- `across_suggested_fees`: Get a fee quote.
- `across_limits`: Get transfer limits.
- `across_available_routes`: Get available routes.
- `across_quote`: Get a fee quote.
- `across_deposit_status`: Track a deposit.
- `across_bridge`: Execute a bridge transaction.
- `across_status`: Get deposit status.

---

## License

MIT
