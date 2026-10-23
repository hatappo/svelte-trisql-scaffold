#!/usr/bin/env node
/**
 *   svelte-trisql-scaffold [--force] [table ...]
 */
import { parseArgs } from 'node:util';
import { scaffold } from './index.ts';

const { positionals, values } = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: { force: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false } }
});
if (values.help) {
	console.log('Usage: svelte-trisql-scaffold [--force] [table ...]');
	process.exit(0);
}
try {
	for (const line of await scaffold({ force: values.force, tables: positionals })) console.log(line);
} catch (e) {
	console.error(e instanceof Error ? e.message : String(e));
	process.exitCode = 1;
}
