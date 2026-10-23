// TypeScript 6 系のツール（svelte-check など）は content mapper を持たないので、`.sql` に弱い型を与える。
// 厳密な型は `npm run typecheck`（TypeScript 7.1 + trisql の content mapper）で検査する。
declare module '*.sql' {
	import type { Query } from 'trisql';
	const query: Query<Record<string, unknown>, Record<string, unknown>>;
	export default query;
}
