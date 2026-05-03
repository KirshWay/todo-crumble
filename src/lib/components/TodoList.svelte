<script lang="ts">
	import type { Todo } from '$lib/types';
	import TodoItem from './TodoItem.svelte';

	type Props = {
		todos: Todo[];
		restoringTodoIds?: Set<string>;
		onComplete: (todo: Todo, element: HTMLElement) => void;
		onRemove: (todo: Todo) => void;
		onTextMount?: (todo: Todo, element: HTMLElement | null) => void;
	};

	let { todos, restoringTodoIds = new Set(), onComplete, onRemove, onTextMount }: Props = $props();
</script>

<div class="todo-list-container">
	<ul class="todo-list">
		{#each todos as todo (todo.id)}
			<TodoItem
				{todo}
				restoring={restoringTodoIds.has(todo.id)}
				{onComplete}
				{onRemove}
				{onTextMount}
			/>
		{/each}
	</ul>
</div>

<style>
	.todo-list-container {
		flex: 1;
		padding: 16px 0;
		position: relative;
		z-index: 10;
		overflow-y: auto;
		min-height: 0;
		-webkit-overflow-scrolling: touch;
	}

	.todo-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
</style>
