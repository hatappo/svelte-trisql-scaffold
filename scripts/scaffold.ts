#!/usr/bin/env node
/**
 * trisql のテーブル定義から、SvelteKit の Remote Functions と CRUD 画面をスキャフォールドする。
 *
 *   node scripts/scaffold.ts [--force] [table ...]
 *
 * 生成するもの（テーブルごと、単一列の主キーを持つものだけ）:
 *   src/lib/sql/<schema>/<table>/crud/      trisql generate と同じ（クエリ、barrel、.d.sql.ts）
 *   src/lib/<table>.remote.ts               list / get / create / update / delete の Remote Functions
 *   src/routes/<table>/+page.svelte         一覧と作成フォーム
 *   src/routes/<table>/[id]/+page.svelte    編集フォームと削除
 *
 * `.remote.ts` と routes は一度生成したら利用者が育てるもの。既にあれば --force が無い限り触らない。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { type Column, exportName, introspect, loadConfig, openDescriber, type Table, writeCrud, writeDeclarations } from 'trisql';

// --- 名前 -----------------------------------------------------------------------

function camel(s: string): string {
	return s.replace(/[_-]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}
function pascal(s: string): string {
	const c = camel(s);
	return c.charAt(0).toUpperCase() + c.slice(1);
}
/** users → user、categories → category、statuses → status。デモ用の素朴な規則 */
function singular(s: string): string {
	if (s.endsWith('ies')) return `${s.slice(0, -3)}y`;
	if (s.endsWith('ses') || s.endsWith('xes')) return s.slice(0, -2);
	if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
	return s;
}

// --- 列 → フォーム項目 ----------------------------------------------------------

type Field = {
	column: Column;
	/** `fields.x.as(<input>)` に渡す種別 */
	input: 'text' | 'number' | 'checkbox' | 'select' | 'date' | 'datetime-local';
	/** 必須のときの valibot 式 */
	schema: string;
	/** 文字列として扱う列か（update の値型が揃っているかの判定に使う） */
	stringLike: boolean;
	options?: string[];
};

function fieldOf(c: Column): Field | null {
	if (c.category === 'A') return null; // 配列は v1 では扱わない
	if (c.typtype === 'e' && c.enumLabels) {
		return { column: c, input: 'select', schema: `v.picklist(${JSON.stringify(c.enumLabels)})`, stringLike: true, options: c.enumLabels };
	}
	switch (c.typeName) {
		case 'bool':
			return { column: c, input: 'checkbox', schema: 'v.boolean()', stringLike: false };
		case 'int2':
		case 'int4':
		case 'float4':
		case 'float8':
			return { column: c, input: 'number', schema: 'v.number()', stringLike: false };
		case 'int8':
		case 'numeric':
			return { column: c, input: 'text', schema: 'v.pipe(v.string(), v.decimal())', stringLike: true };
		case 'date':
			return { column: c, input: 'date', schema: 'v.string()', stringLike: true };
		case 'timestamp':
		case 'timestamptz':
			return { column: c, input: 'datetime-local', schema: 'v.string()', stringLike: true };
		case 'json':
		case 'jsonb':
			return { column: c, input: 'text', schema: 'v.pipe(v.string(), v.check(isJson, "invalid JSON"))', stringLike: true };
		default:
			return { column: c, input: 'text', schema: 'v.string()', stringLike: true };
	}
}

/** フォームでは空文字が「未入力」なので、任意項目は undefined に寄せる */
function schemaExpr(f: Field, optional: boolean): string {
	if (f.input === 'checkbox') return 'v.optional(v.boolean(), false)';
	if (!optional) return f.schema;
	if (f.input === 'number') return 'v.optional(v.number())';
	return `v.optional(v.pipe(v.string(), v.transform((s) => (s === '' ? undefined : s)), v.optional(${f.schema})))`;
}

// --- テーブル → 生成物 ------------------------------------------------------------

type Plan = {
	table: Table;
	pk: Column;
	pkField: Field;
	createFields: { field: Field; optional: boolean }[];
	updateFields: Field[];
	names: { singular: string; Singular: string; Plural: string; list: string; get: string; create: string; update: string; remove: string };
	crud: { list: string; getByPk: string; insert: string; updateByPk: string; deleteByPk: string; importPath: string };
};

function plan(table: Table): Plan | null {
	if (!table.primaryKey || table.primaryKey.length !== 1) return null;
	const pk = table.columns.find((c) => c.name === table.primaryKey?.[0]);
	const pkField = pk ? fieldOf(pk) : null;
	if (!pk || !pkField) return null;
	const insertable = table.columns.filter((c) => c.generated === '' && c.identity !== 'a');
	const isAutoPk = (c: Column) => c.name === pk.name && (c.hasDefault || c.identity !== '');
	const isAutoTime = (c: Column) => c.hasDefault && ['timestamp', 'timestamptz', 'date'].includes(c.typeName);
	const createFields = insertable
		.filter((c) => !isAutoPk(c) && !isAutoTime(c))
		.map((c) => ({ field: fieldOf(c), optional: !c.notNull || c.hasDefault || c.identity !== '' }))
		.filter((x): x is { field: Field; optional: boolean } => x.field !== null);
	const updateFields = createFields.map((x) => x.field).filter((f) => f.column.name !== pk.name);
	const s = singular(table.name);
	const pkKebab = pk.name.replaceAll('_', '-');
	const relSql = `#lib/sql/${table.schema}/${table.name}/crud/index.ts`;
	return {
		table,
		pk,
		pkField,
		createFields,
		updateFields,
		names: {
			singular: camel(s),
			Singular: pascal(s),
			Plural: pascal(table.name),
			list: `list${pascal(table.name)}`,
			get: `get${pascal(s)}`,
			create: `create${pascal(s)}`,
			update: `update${pascal(s)}`,
			remove: `delete${pascal(s)}`
		},
		crud: {
			list: 'list',
			getByPk: exportName(`get-by-${pkKebab}`),
			insert: 'insert',
			updateByPk: exportName(`update-by-${pkKebab}`),
			deleteByPk: exportName(`delete-by-${pkKebab}`),
			importPath: relSql
		}
	};
}

function remoteSource(p: Plan): string {
	const { names, crud, pk, pkField } = p;
	const pkSchema = pkField.input === 'number' ? 'v.number()' : 'v.string()';
	const pkFormSchema = pkField.input === 'number' ? 'v.pipe(v.string(), v.transform(Number))' : 'v.string()';
	const createEntries = p.createFields.map(({ field, optional }) => `\t\t${field.column.name}: ${schemaExpr(field, optional)}`);
	const updateEntries = p.updateFields.map((field) => `\t\t${field.column.name}: ${schemaExpr(field, true)}`);
	const needsJson = [...p.createFields.map((x) => x.field), ...p.updateFields].some((f) => f.schema.includes('isJson'));
	// 生成した update テンプレートの `updates` の値型はサンプル列 1 つから決まる。型が混在する場合は cast で逃がす（trisql#4 の inline type で解消予定）
	const mixed = p.updateFields.some((f) => !f.stringLike);
	const updatesExpr = mixed
		? `updates as unknown as Parameters<typeof ${crud.updateByPk}.one>[1]['updates']`
		: 'updates';
	return [
		`// Generated by svelte-trisql-scaffold for table ${p.table.schema}.${p.table.name}. Edit freely; regenerate with --force to overwrite.`,
		`import { command, form, query } from '$app/server';`,
		`import * as v from 'valibot';`,
		`import { db } from '#lib/server/db.ts';`,
		`import { ${[crud.deleteByPk, crud.getByPk, crud.insert, crud.list, crud.updateByPk].sort().join(', ')} } from '${crud.importPath}';`,
		'',
		...(needsJson ? ['const isJson = (s: string) => {', '\ttry {', '\t\tJSON.parse(s);', '\t\treturn true;', '\t} catch {', '\t\treturn false;', '\t}', '};', ''] : []),
		`export const ${names.list} = query(async () => ${crud.list}.run(await db(), { limit: 100 }));`,
		'',
		`export const ${names.get} = query(${pkSchema}, async (${pk.name}) => ${crud.getByPk}.maybeOne(await db(), { ${pk.name} }));`,
		'',
		`export const ${names.create} = form(`,
		'\tv.object({',
		createEntries.join(',\n'),
		'\t}),',
		'\tasync (data) => {',
		`\t\tconst created = await ${crud.insert}.one(await db(), data);`,
		`\t\tawait ${names.list}().refresh();`,
		`\t\treturn { ${pk.name}: created.${pk.name} };`,
		'\t}',
		');',
		'',
		`export const ${names.update} = form(`,
		'\tv.object({',
		[`\t\t${pk.name}: ${pkFormSchema}`, ...updateEntries].join(',\n'),
		'\t}),',
		`\tasync ({ ${pk.name}, ...rest }) => {`,
		'\t\tconst updates = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));',
		'\t\tif (Object.keys(updates).length === 0) return;',
		`\t\tawait ${crud.updateByPk}.one(await db(), { where: { ${pk.name} }, updates: ${updatesExpr} });`,
		`\t\tawait ${names.list}().refresh();`,
		`\t\tawait ${names.get}(${pk.name}).refresh();`,
		'\t}',
		');',
		'',
		`export const ${names.remove} = command(${pkSchema}, async (${pk.name}) => {`,
		`\tawait ${crud.deleteByPk}.maybeOne(await db(), { ${pk.name} });`,
		`\tawait ${names.list}().refresh();`,
		'});',
		''
	].join('\n');
}

function inputMarkup(formVar: string, f: Field, indent: string): string {
	const field = `${formVar}.fields.${f.column.name}`;
	const label = f.column.name;
	const issues = `${indent}{#each ${field}.issues() as issue}<p class="issue">{issue.message}</p>{/each}`;
	if (f.input === 'select') {
		return [
			`${indent}<label>${label}`,
			`${indent}\t<select {...${field}.as('select')}>`,
			`${indent}\t\t{#each ${JSON.stringify(f.options)} as option}<option value={option}>{option}</option>{/each}`,
			`${indent}\t</select>`,
			`${indent}</label>`,
			issues
		].join('\n');
	}
	if (f.input === 'checkbox') {
		return [`${indent}<label><input {...${field}.as('checkbox')} /> ${label}</label>`, issues].join('\n');
	}
	return [`${indent}<label>${label} <input {...${field}.as('${f.input}')} /></label>`, issues].join('\n');
}

function displayExpr(row: string, c: Column): string {
	if (['timestamp', 'timestamptz', 'date'].includes(c.typeName)) return `{${row}.${c.name} instanceof Date ? ${row}.${c.name}.toISOString() : ${row}.${c.name}}`;
	if (['json', 'jsonb'].includes(c.typeName)) return `{JSON.stringify(${row}.${c.name})}`;
	return `{${row}.${c.name}}`;
}

function listPageSource(p: Plan): string {
	const { names, table, pk } = p;
	const shown = table.columns.filter((c) => c.category !== 'A');
	return [
		`<!-- Generated by svelte-trisql-scaffold for ${table.name}. Edit freely. -->`,
		'<script lang="ts">',
		`\timport { ${names.create}, ${names.list} } from '#lib/${table.name}.remote.ts';`,
		'</script>',
		'',
		`<h1>${table.name}</h1>`,
		'',
		'<table>',
		'\t<thead>',
		`\t\t<tr>${shown.map((c) => `<th>${c.name}</th>`).join('')}</tr>`,
		'\t</thead>',
		'\t<tbody>',
		`\t\t{#each await ${names.list}() as row (row.${pk.name})}`,
		'\t\t\t<tr>',
		...shown.map((c) =>
			c.name === pk.name
				? `\t\t\t\t<td><a href="/${table.name}/{row.${pk.name}}">${displayExpr('row', c)}</a></td>`
				: `\t\t\t\t<td>${displayExpr('row', c)}</td>`
		),
		'\t\t\t</tr>',
		'\t\t{/each}',
		'\t</tbody>',
		'</table>',
		'',
		`<h2>New ${names.singular}</h2>`,
		`<form {...${names.create}}>`,
		...p.createFields.map(({ field }) => inputMarkup(names.create, field, '\t')),
		'\t<button>Create</button>',
		'</form>',
		''
	].join('\n');
}

function detailPageSource(p: Plan): string {
	const { names, table, pk } = p;
	const pkParam = p.pkField.input === 'number' ? "Number(page.params.id ?? '')" : "page.params.id ?? ''";
	return [
		`<!-- Generated by svelte-trisql-scaffold for ${table.name}. Edit freely. -->`,
		'<script lang="ts">',
		`\timport { goto } from '$app/navigation';`,
		`\timport { page } from '$app/state';`,
		`\timport { ${names.remove}, ${names.get}, ${names.update} } from '#lib/${table.name}.remote.ts';`,
		'',
		`\tconst row = $derived(await ${names.get}(${pkParam}));`,
		'',
		'\tasync function remove() {',
		'\t\tif (!row) return;',
		`\t\tawait ${names.remove}(row.${pk.name});`,
		`\t\tawait goto('/${table.name}');`,
		'\t}',
		'</script>',
		'',
		'{#if row}',
		`\t<h1>${names.singular} {row.${pk.name}}</h1>`,
		`\t<form {...${names.update}}>`,
		`\t\t<input {...${names.update}.fields.${pk.name}.as('hidden', String(row.${pk.name}))} />`,
		...p.updateFields.map((f) => inputMarkup(names.update, f, '\t\t')),
		'\t\t<button>Save</button>',
		'\t</form>',
		'\t<button onclick={remove}>Delete</button>',
		'{:else}',
		'\t<p>Not found.</p>',
		'{/if}',
		`<p><a href="/${table.name}">Back to ${table.name}</a></p>`,
		''
	].join('\n');
}

// --- 書き出し ------------------------------------------------------------------

function write(path: string, content: string, force: boolean, out: string[]): void {
	const shown = relative(process.cwd(), path);
	if (existsSync(path) && !force) {
		out.push(`kept    ${shown} (use --force to overwrite)`);
		return;
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
	out.push(`wrote   ${shown}`);
}

async function main(argv: string[]): Promise<number> {
	const { positionals, values } = parseArgs({ args: argv, allowPositionals: true, options: { force: { type: 'boolean', default: false } } });
	const config = loadConfig(process.cwd());
	const describer = await openDescriber(config);
	try {
		let tables = await introspect(describer, config.generate.schemas);
		if (positionals.length > 0) tables = tables.filter((t) => positionals.includes(t.name) || positionals.includes(`${t.schema}.${t.name}`));
		if (tables.length === 0) {
			console.error('No tables to scaffold.');
			return 1;
		}
		const crud = writeCrud(config.generate.out, tables);
		const decl = await writeDeclarations(crud.sqlFiles, describer);
		console.log(`crud: ${crud.written.length} written, ${crud.unchanged.length} unchanged; declarations: ${decl.written.length} written, ${decl.failed.length} skipped`);
		const out: string[] = [];
		for (const table of tables) {
			const p = plan(table);
			if (!p) {
				out.push(`skipped ${table.schema}.${table.name} (needs a single-column primary key)`);
				continue;
			}
			write(join(config.root, 'src', 'lib', `${table.name}.remote.ts`), remoteSource(p), values.force, out);
			write(join(config.root, 'src', 'routes', table.name, '+page.svelte'), listPageSource(p), values.force, out);
			write(join(config.root, 'src', 'routes', table.name, '[id]', '+page.svelte'), detailPageSource(p), values.force, out);
		}
		for (const line of out) console.log(line);
		return 0;
	} finally {
		await describer.close();
	}
}

process.exitCode = await main(process.argv.slice(2));
