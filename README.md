# svelte-trisql-scaffold

Scaffold SvelteKit 3 Remote Functions and CRUD pages from a PostgreSQL schema, with [trisql](https://github.com/hatappo/trisql) carrying the types from the schema through 2-way SQL templates to the form.

- [`packages/svelte-trisql-scaffold`](./packages/svelte-trisql-scaffold): the scaffolder (`npx svelte-trisql-scaffold`).
- [`demo`](./demo): a SvelteKit app you can run to see the result. It needs no database server; an embedded PGlite loads `demo/db/schema.sql` at startup.

## Try the demo

```sh
npm install
npm run demo
```

Open http://localhost:5173/users or /posts: list, create, edit and delete rows, all typed from `demo/db/schema.sql`. See [demo/README.md](./demo/README.md) for how it is wired.

Status: experimental, built against TypeScript 7.1 (beta) content mappers.
