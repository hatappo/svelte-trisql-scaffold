# svelte-trisql-scaffold

Generates, for each table of a PostgreSQL schema, SvelteKit 3 Remote Functions and CRUD pages whose types come from [trisql](https://github.com/hatappo/trisql).

```sh
npx svelte-trisql-scaffold [--force] [table ...]
```

Run it in a SvelteKit project that has `trisql.json` (see trisql). For every table with a single-column primary key it writes:

- `src/lib/sql/<schema>/<table>/crud/`: the trisql CRUD templates, barrel and `.d.sql.ts` declarations (same as `npx trisql generate`)
- `src/lib/<table>.remote.ts`: `list`, `get`, `create` (form), `update` (form) and `delete` (command), validated with Valibot schemas derived from the columns
- `src/routes/<table>/+page.svelte`: list and create form
- `src/routes/<table>/[id]/+page.svelte`: edit form (prefilled) and delete

Existing `.remote.ts` and route files are kept unless `--force` is given; the `crud/` directory is always regenerated.

Column to form mapping: enums become `<select>`, booleans checkboxes, `int2` / `int4` / floats number inputs, `int8` / `numeric` text validated as decimals, dates and timestamps `date` / `datetime-local` inputs, JSON a text field validated as JSON, everything else text. Array columns are left out of forms. Nullable and defaulted columns are optional; an empty input becomes `undefined`, which trisql renders as `DEFAULT`.

The generated files expect `#lib/server/db.ts` to export `db(): Promise<client>` where the client has `query(text, values)` returning `{ rows }` (`pg`, PGlite, Neon), and `valibot` to be installed.
