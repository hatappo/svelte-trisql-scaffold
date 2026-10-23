import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import trisql from 'trisql/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// `.sql` を型付きクエリのモジュールにする。サーバ側のコード（.remote.ts など）からだけ import すること
		trisql(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true }
			},
			experimental: { remoteFunctions: true },
			adapter: adapter()
		})
	]
});
