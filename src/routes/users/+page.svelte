<script lang="ts">
	import { createUser, deleteUser, listUsers } from '#lib/users.remote.ts';
</script>

<h1>Users</h1>

<ul>
	{#each await listUsers() as user (user.id)}
		<li>
			{user.email} — {user.name ?? '(no name)'} — {user.status}
			<button onclick={() => deleteUser(user.id)}>delete</button>
		</li>
	{/each}
</ul>

<h2>Create</h2>
<form {...createUser}>
	<label>Email <input {...createUser.fields.email.as('email')} /></label>
	{#each createUser.fields.email.issues() as issue}<p class="issue">{issue.message}</p>{/each}
	<label>Name <input {...createUser.fields.name.as('text')} /></label>
	<button>Create</button>
</form>
