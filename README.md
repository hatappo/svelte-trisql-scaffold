# svelte-trisql-scaffold

A proof of concept: scaffold SvelteKit 3 Remote Functions and CRUD pages from a PostgreSQL schema, with [trisql](https://github.com/hatappo/trisql) carrying the types from the schema through 2-way SQL templates to the form.

- [`packages/svelte-trisql-scaffold`](./packages/svelte-trisql-scaffold): the scaffolder (`npx svelte-trisql-scaffold`).
- [`demo`](./demo): a SvelteKit app you can run to see the result. It needs no database server; an embedded PGlite loads `demo/db/schema.sql` at startup.

Status: proof of concept, not maintained. It was built against TypeScript 7.1 (beta) content mappers and a specific trisql revision, tagged [`poc/svelte-trisql-scaffold`](https://github.com/hatappo/trisql/tree/poc/svelte-trisql-scaffold); see below.

## Requirements

- Node 24 or later
- trisql checked out next to this repository, at the tag `poc/svelte-trisql-scaffold` (commit `0c5a87e`), and built

This project links trisql with `file:../trisql` (from the repository root), not from npm.

For this proof of concept, trisql was intentionally extended with experimental features: generated declaration files beside each `.sql` (`.d.sql.ts`, the `trisql declarations` command, and `declarations.auto`, which lets the content mapper rewrite them on every type check). svelte-check needs them because Svelte's tooling still runs on TypeScript 6, which has no content mappers. These features did not fit trisql's direction of targeting TypeScript 7.1 content mappers only, and were removed in later trisql versions ([trisql#15](https://github.com/hatappo/trisql/pull/15)). Newer trisql therefore does not work with this project; use the tag above.

## Reproduce

```sh
mkdir trisql-poc && cd trisql-poc

git clone https://github.com/hatappo/trisql
cd trisql
git checkout poc/svelte-trisql-scaffold
npm install
npm run build
cd ..

# this repository, as a sibling of trisql/
cd svelte-trisql-scaffold
npm install
npm run demo
```

Open http://localhost:5173/users or /posts: list, create, edit and delete rows, all typed from `demo/db/schema.sql`. See [demo/README.md](./demo/README.md) for how it is wired.
