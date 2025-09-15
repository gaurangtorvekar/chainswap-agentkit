import fs from 'node:fs';
import path from 'node:path';
import type { ToolkitConfig, ChainswapPlugin } from '../types.js';

const exists = (p: string) => { try { fs.accessSync(p); return true; } catch { return false; } };

export async function loadConfig(cwd = process.cwd()): Promise<Partial<ToolkitConfig> & { plugins?: (string|ChainswapPlugin)[] }> {
  const js = path.join(cwd, 'chainswap-agentkit.config.js');
  const json = path.join(cwd, 'chainswap-agentkit.config.json');
  const pkg = path.join(cwd, 'package.json');
  if (exists(js)) return (await import(pathToFileUrl(js))).default || (await import(pathToFileUrl(js)));
  if (exists(json)) return JSON.parse(fs.readFileSync(json, 'utf8'));
  if (exists(pkg)) {
    const p = JSON.parse(fs.readFileSync(pkg, 'utf8'));
    if (p.chainswapAgentKit) return p.chainswapAgentKit;
  }
  return {};
}

export async function resolvePlugins(entries: (string|ChainswapPlugin)[], cwd = process.cwd()): Promise<ChainswapPlugin[]> {
  const out: ChainswapPlugin[] = [];
  for (const e of entries) {
    if (typeof e !== 'string') { out.push(e); continue; }
    const mod = await importModule(e, cwd);
    const plugin = (mod.default || mod).plugin || (mod.default || mod);
    out.push(plugin);
  }
  return out;
}

function pathToFileUrl(p: string) {
  let a = path.resolve(p); if (process.platform === 'win32') a = '/' + a.replace(/\\/g, '/');
  return 'file://' + a;
}

async function importModule(specifier: string, cwd: string) {
  try { return await import(specifier); } catch {}
  const nm = path.join(cwd, 'node_modules', specifier);
  return await import(pathToFileUrl(nm));
}

