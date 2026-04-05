<script lang="ts">
	import type { Todo } from '$lib/types';
	import TodoItem from './TodoItem.svelte';

	type Props = {
		todos: Todo[];
		onComplete: (todo: Todo, element: HTMLElement) => void;
		onRemove: (todo: Todo) => void;
	};

	let { todos, onComplete, onRemove }: Props = $props();
</script>

<div class="todo-list-container">
	<ul class="todo-list">
		{#each todos as todo (todo.id)}
			<TodoItem {todo} {onComplete} {onRemove} />
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
