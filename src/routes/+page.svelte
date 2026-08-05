<script lang="ts">
	import { tick } from 'svelte';
	import TodoList from '$lib/components/TodoList.svelte';
	import FallingLetters from '$lib/components/FallingLetters.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { CompletedTodo, Todo, DropLettersApi } from '$lib/types';

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
	let restoringTodoIds: Set<string> = $state(new Set());
	const todoTextElements = new Map<string, HTMLElement>();

	const handlePhysicsReady = (api: DropLettersApi) => {
		dropLettersFn = api.dropLetters;
	};

	const handleComplete = (todo: Todo, element: HTMLElement) => {
		if (dropLettersFn) {
			dropLettersFn({ todo, index: todos.findIndex((t) => t.id === todo.id) }, element);
		}
	};

	const handleRemove = (todo: Todo) => {
		todos = todos.filter((t) => t.id !== todo.id);
	};

	const restoreTodoAtIndex = ({ todo, index }: CompletedTodo) => {
		if (todos.some((t) => t.id === todo.id)) return;

		const nextTodos = [...todos];
		nextTodos.splice(Math.max(0, Math.min(index, nextTodos.length)), 0, todo);
		todos = nextTodos;
	};

	const handlePrepareRestore = async (completed: CompletedTodo) => {
		restoreTodoAtIndex(completed);
		restoringTodoIds = new Set(restoringTodoIds).add(completed.todo.id);
		await tick();
		return todoTextElements.get(completed.todo.id) ?? null;
	};

	const handleRestoreComplete = ({ todo }: CompletedTodo) => {
		const nextRestoringIds = new Set(restoringTodoIds);
		nextRestoringIds.delete(todo.id);
		restoringTodoIds = nextRestoringIds;
	};

	const handleTextMount = (todo: Todo, element: HTMLElement | null) => {
		if (element) {
			todoTextElements.set(todo.id, element);
		} else {
			todoTextElements.delete(todo.id);
		}
	};
</script>

<svelte:head>
	<title>todo-crumble</title>
</svelte:head>

<div class="app">
	<header class="app-header">
		<ThemeToggle />
	</header>
	<TodoList
		{todos}
		{restoringTodoIds}
		onComplete={handleComplete}
		onRemove={handleRemove}
		onTextMount={handleTextMount}
	/>
	<FallingLetters
		onReady={handlePhysicsReady}
		onPrepareRestore={handlePrepareRestore}
		onRestoreComplete={handleRestoreComplete}
	/>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		min-height: 100vh;
		background: var(--color-bg);
		position: relative;
		transition: background-color 0.25s ease;
	}

	.app-header {
		display: flex;
		justify-content: flex-end;
		flex: none;
		padding:
			max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 4px
			max(12px, env(safe-area-inset-left));
		position: relative;
		z-index: 200;
	}

	@media (prefers-reduced-motion: reduce) {
		.app {
			transition: none;
		}
	}
</style>
