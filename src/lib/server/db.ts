// デモ用の DB。内包 PGlite にスキーマを適用し、プロセス内で 1 つだけ持つ。
// `pg` の Pool / Client と同じ `query(text, values)` の形なので、trisql のクエリにそのまま渡せる。
import { PGlite } from '@electric-sql/pglite';
import schema from '../../../db/schema.sql?raw';

let instance: Promise<PGlite> | undefined;

export function db(): Promise<PGlite> {
	instance ??= (async () => {
		const pglite = new PGlite();
		await pglite.waitReady;
		await pglite.exec(schema);
		await pglite.exec(`
			INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice'), ('bob@example.com', NULL);
		`);
		return pglite;
	})();
	return instance;
}
