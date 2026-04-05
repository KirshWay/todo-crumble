<script lang="ts">
	import TodoList from '$lib/components/TodoList.svelte';
	import FallingLetters from '$lib/components/FallingLetters.svelte';
	import type { Todo, DropLettersApi } from '$lib/types';

	let todos: Todo[] = $state([
		{ id: crypto.randomUUID(), text: 'Tensorlake Explorations #1' },
		{ id: crypto.randomUUID(), text: 'Tensorlake Explorations #2' },
		{ id: crypto.randomUUID(), text: 'Collect items from the mailbox' },
		{ id: crypto.randomUUID(), text: 'CVD Assignment + Reading' },
		{ id: crypto.randomUUID(), text: 'Talk to Prof. Raquel' },
		{ id: crypto.randomUUID(), text: "Duke in LA - Karen's Midterm" },
		{ id: crypto.randomUUID(), text: "Duke in LA - Karen's Essay" },
		{ id: crypto.randomUUID(), text: 'Project Blue - Full Screen Overheat' },
		{ id: crypto.randomUUID(), text: 'Project Blue - Building State' },
		{ id: crypto.randomUUID(), text: 'Project Blue - Level selection' },
		{ id: crypto.randomUUID(), text: 'Project Blue - Movement system' },
		{ id: crypto.randomUUID(), text: 'Duke in NY living preferences' },
		{ id: crypto.randomUUID(), text: 'OK Food Night' }
	]);

	let dropLettersFn: DropLettersApi['dropLetters'] | null = null;

	const handlePhysicsReady = (api: DropLettersApi) => {
		dropLettersFn = api.dropLetters;
	};

	const handleComplete = (todo: Todo, element: HTMLElement) => {
		const rect = element.getBoundingClientRect();

		if (dropLettersFn) {
			dropLettersFn(todo.text, rect.left, rect.top);
		}
	};

	const handleRemove = (todo: Todo) => {
		todos = todos.filter((t) => t.id !== todo.id);
	};
</script>

<svelte:head>
	<title>todo-crumble</title>
</svelte:head>

<div class="app">
	<TodoList {todos} onComplete={handleComplete} onRemove={handleRemove} />
	<FallingLetters onReady={handlePhysicsReady} />
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: #fff;
		position: relative;
	}
</style>
