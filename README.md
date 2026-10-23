# svelte-trisql-scaffold

A proof of concept: scaffold SvelteKit 3 Remote Functions and CRUD pages from a PostgreSQL schema, with [trisql](https://github.com/hatappo/trisql) carrying the types from the schema through 2-way SQL templates to the form.

- [`packages/svelte-trisql-scaffold`](./packages/svelte-trisql-scaffold): the scaffolder (`npx svelte-trisql-scaffold`).
- [`demo`](./demo): a SvelteKit app you can run to see the result. It needs no database server; an embedded PGlite loads `demo/db/schema.sql` at startup.

Status: proof of concept, not maintained. It was built against TypeScript 7.1 (beta) content mappers and a specific trisql commit; see below.

## Requirements

- Node 24 or later
- trisql checked out next to this repository, at commit [`0c5a87e`](https://github.com/hatappo/trisql/commit/0c5a87e), and built

This project links trisql with `file:../trisql` (from the repository root), not from npm. It depends on trisql's declaration files (`.d.sql.ts`, `trisql declarations`, `declarations.auto`), which svelte-check needs because Svelte's tooling runs on TypeScript 6 without content mappers. Those features existed in trisql only around that commit and were removed later, so newer trisql versions do not work with this project.

## Reproduce

```sh
mkdir trisql-poc && cd trisql-poc

git clone https://github.com/hatappo/trisql
cd trisql
git checkout 0c5a87e
npm install
npm run build
cd ..

# this repository, as a sibling of trisql/
cd svelte-trisql-scaffold
npm install
npm run demo
```

Open http://localhost:5173/users or /posts: list, create, edit and delete rows, all typed from `demo/db/schema.sql`. See [demo/README.md](./demo/README.md) for how it is wired.
