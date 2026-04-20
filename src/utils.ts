import type { Options } from './interfaces';

// 从 options 链提取 token 名称数组，顺序为从根到当前
export function buildTokenChain(options: Options): string[] {
  const arr: string[] = [];
  let cur: Options | undefined = options;
  while (cur && cur.token) {
    arr.push(cur.token.name || '<anonymous>');
    cur = cur.parent;
  }
  return arr.reverse();
}
