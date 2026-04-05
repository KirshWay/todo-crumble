<script lang="ts">
	import type { Todo } from '$lib/types';

	type Props = {
		todo: Todo;
		onComplete: (todo: Todo, element: HTMLElement) => void;
		onRemove: (todo: Todo) => void;
	};

	let { todo, onComplete, onRemove }: Props = $props();

	let textEl: HTMLSpanElement;
	let itemEl: HTMLLIElement;
	let checked = $state(false);
	let collapsing = $state(false);

	const handleChange = () => {
		checked = true;
		onComplete(todo, textEl);

		requestAnimationFrame(() => {
			collapsing = true;
		});
	};

	const handleTransitionEnd = (e: TransitionEvent) => {
		if (e.propertyName === 'opacity' && collapsing) {
			onRemove(todo);
		}
	};
</script>

<li
	bind:this={itemEl}
	class="todo-item"
	class:collapsing
	ontransitionend={handleTransitionEnd}
>
	<label class="todo-label">
		<input type="checkbox" {checked} onchange={handleChange} disabled={checked} />
		<span class="todo-text" class:completed={checked} bind:this={textEl}>
			{todo.text}
		</span>
	</label>
</li>

<style>
	.todo-item {
		padding: 10px 16px;
		max-height: 80px;
		opacity: 1;
		overflow: hidden;
		transition:
			opacity 0.25s ease,
			max-height 0.3s ease 0.05s,
			padding 0.3s ease 0.05s;
	}

	.todo-item.collapsing {
		opacity: 0;
		max-height: 0;
		padding-top: 0;
		padding-bottom: 0;
	}

	.todo-label {
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		min-height: 44px;
	}

	.todo-label input[type='checkbox'] {
		appearance: none;
		width: 22px;
		height: 22px;
		min-width: 22px;
		border: 2px solid #bbb;
		border-radius: 50%;
		cursor: pointer;
		flex-shrink: 0;
		transition: border-color 0.2s;
		padding: 0;
		margin: 0;
	}

	.todo-label input[type='checkbox']:checked {
		border-color: #5dc2af;
		background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%235dc2af' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E")
			no-repeat center;
	}

	.todo-text {
		font-size: 17px;
		color: #222;
		transition: color 0.15s;
		word-break: break-word;
	}

	.completed {
		color: #ccc;
		text-decoration: line-through;
	}
</style>
