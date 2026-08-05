<script lang="ts">
	import type { Todo } from '$lib/types';

	type Props = {
		todo: Todo;
		restoring?: boolean;
		onComplete: (todo: Todo, element: HTMLElement) => void;
		onRemove: (todo: Todo) => void;
		onTextMount?: (todo: Todo, element: HTMLElement | null) => void;
	};

	let { todo, restoring = false, onComplete, onRemove, onTextMount }: Props = $props();

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

	$effect(() => {
		if (!textEl) return;

		onTextMount?.(todo, textEl);

		return () => {
			onTextMount?.(todo, null);
		};
	});
</script>

<li
	bind:this={itemEl}
	class="todo-item"
	class:collapsing
	class:restoring
	ontransitionend={handleTransitionEnd}
>
	<label class="todo-label">
		<input type="checkbox" {checked} onchange={handleChange} disabled={checked || restoring} />
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

	.todo-item.restoring .todo-label {
		opacity: 0;
		pointer-events: none;
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
		border: 2px solid var(--color-checkbox);
		border-radius: 50%;
		cursor: pointer;
		flex-shrink: 0;
		transition:
			border-color 0.2s,
			background-color 0.2s;
		padding: 0;
		margin: 0;
	}

	.todo-label input[type='checkbox']:checked {
		border-color: var(--color-accent);
		background: var(--checkmark-image) no-repeat center;
	}

	.todo-label input[type='checkbox']:focus-visible {
		outline: 3px solid var(--color-focus-ring);
		outline-offset: 3px;
	}

	.todo-text {
		font-size: 17px;
		color: var(--color-text);
		transition: color 0.15s;
		word-break: break-word;
	}

	.completed {
		color: var(--color-text-completed);
		text-decoration: line-through;
	}

	@media (prefers-reduced-motion: reduce) {
		.todo-label input[type='checkbox'],
		.todo-text {
			transition: none;
		}
	}
</style>
