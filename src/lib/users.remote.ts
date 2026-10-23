import { command, form, query } from '$app/server';
import * as v from 'valibot';
import { db } from '#lib/server/db.ts';
import { deleteById, getById, insert, list, updateById } from '#lib/sql/public/users/crud/index.ts';

export const listUsers = query(async () => list.run(await db(), { limit: 100 }));

export const getUser = query(v.string(), async (id) => getById.maybeOne(await db(), { id }));

export const createUser = form(
	v.object({
		email: v.pipe(v.string(), v.email()),
		name: v.optional(v.string())
	}),
	async (data) => {
		const created = await insert.one(await db(), { email: data.email, name: data.name || undefined });
		await listUsers().refresh();
		return { id: created.id };
	}
);

export const renameUser = form(
	v.object({ id: v.string(), name: v.string() }),
	async ({ id, name }) => {
		await updateById.one(await db(), { where: { id }, updates: { name } });
		await listUsers().refresh();
	}
);

export const deleteUser = command(v.string(), async (id) => {
	await deleteById.maybeOne(await db(), { id });
	await listUsers().refresh();
});
