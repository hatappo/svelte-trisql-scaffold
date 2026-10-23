// TypeScript 7.1（alias パッケージ typescript7）の tsc を、インストール場所に依存せずに起動する
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pkg = fileURLToPath(import.meta.resolve('typescript7/package.json'));
const bin = pkg.replace(/package\.json$/, 'bin/tsc');
const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
