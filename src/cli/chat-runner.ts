import type { ChainswapLangchainToolkit } from '../toolkit/index.js';

type ChatRunnerOptions = {
  toolkit: ChainswapLangchainToolkit;
  llmProvider?: 'openai';
  llmModel?: string;
};

async function createOpenAi(model?: string) {
  try {
    const mod = await import('openai');
    const OpenAI = (mod as any).default || (mod as any).OpenAI || (mod as any);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const m = model || 'gpt-4o-mini';
    return {
      async generate(prompt: string) {
        const res = await client.chat.completions.create({
          model: m,
          messages: [
            { role: 'system', content: 'Return ONLY valid JSON with no commentary.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          response_format: { type: 'json_object' } as any,
        });
        return res.choices?.[0]?.message?.content || '';
      }
    };
  } catch (e) {
    return null;
  }
}

export function createChatRunner(opts: ChatRunnerOptions) {
  const tools = opts.toolkit.getTools();
  let llm: { generate: (p: string) => Promise<string> } | null = null;

  async function handle(line: string) {
    const s = line.trim();
    if (!s) return;
    // Try direct JSON tool call
    try {
      const { tool, params } = JSON.parse(s);
      const t = tools[tool];
      if (!t) throw new Error('Unknown tool');
      const res = await t.execute(opts.toolkit.getContext(), params || {});
      process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      return;
    } catch {}
    // LLM plan
    if (!llm && opts.llmProvider === 'openai') llm = await createOpenAi(opts.llmModel);
    if (llm) {
      const prompt = `You are a tool planner. Available tools: ${Object.keys(tools).join(', ')}. Output JSON {"tool":string,"params":object}. User: ${s}`;
      try {
        const out = await llm.generate(prompt);
        const { tool, params } = JSON.parse(out);
        const t = tools[tool];
        if (!t) throw new Error('Unknown tool chosen by planner');
        const res = await t.execute(opts.toolkit.getContext(), params || {});
        process.stdout.write(JSON.stringify(res, null, 2) + '\n');
        return;
      } catch (e: any) {
        process.stdout.write('Planner failed: ' + (e?.message || '') + '\n');
      }
    }
    process.stdout.write('Enter JSON {"tool":"...","params":{...}} or set OPENAI_API_KEY for NL.\n');
  }

  return {
    async runStdio() {
      process.stdout.write('chainswap-agentkit chat — JSON per line or NL with OpenAI.\n');
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', async (chunk) => {
        const text = typeof chunk === 'string' ? chunk : String(chunk);
        for (const l of text.split('\n')) await handle(l);
      });
    }
  };
}
