<script lang="ts">
	import { onMount } from 'svelte';

	type Theme = 'light' | 'dark';

	const STORAGE_KEY = 'todo-crumble-theme';
	let theme: Theme = $state('light');

	const applyTheme = (nextTheme: Theme) => {
		theme = nextTheme;
		document.documentElement.dataset.theme = nextTheme;
		document.documentElement.style.colorScheme = nextTheme;
	};

	const toggleTheme = () => {
		const nextTheme = theme === 'light' ? 'dark' : 'light';
		applyTheme(nextTheme);

		try {
			localStorage.setItem(STORAGE_KEY, nextTheme);
		} catch {
			// The selected theme still applies when storage is unavailable.
		}
	};

	onMount(() => {
		const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
		const initialTheme = document.documentElement.dataset.theme;
		applyTheme(initialTheme === 'dark' ? 'dark' : 'light');

		const handleSystemThemeChange = (event: MediaQueryListEvent) => {
			try {
				if (localStorage.getItem(STORAGE_KEY)) return;
			} catch {
				// Continue following the system preference when storage is unavailable.
			}

			applyTheme(event.matches ? 'dark' : 'light');
		};

		colorScheme.addEventListener('change', handleSystemThemeChange);

		return () => colorScheme.removeEventListener('change', handleSystemThemeChange);
	});
</script>

<button
	class="theme-toggle"
	type="button"
	aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
	aria-pressed={theme === 'dark'}
	title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
	onclick={toggleTheme}
>
	<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="12" cy="12" r="3.75" />
		<path d="M12 2.25v2M12 19.75v2M4.25 12h-2M21.75 12h-2M5.1 5.1 3.7 3.7M20.3 20.3l-1.4-1.4M18.9 5.1l1.4-1.4M3.7 20.3l1.4-1.4" />
	</svg>
	<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true">
		<path d="M20.25 15.25A8.5 8.5 0 0 1 8.75 3.75a8.5 8.5 0 1 0 11.5 11.5Z" />
	</svg>
</button>

<style>
	.theme-toggle {
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border: 1px solid var(--color-control-border);
		border-radius: 50%;
		background: var(--color-control-bg);
		color: var(--color-control-icon);
		box-shadow: var(--shadow-control);
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease,
			box-shadow 0.2s ease,
			transform 0.12s ease;
	}

	.theme-toggle:hover {
		background: var(--color-control-hover);
		border-color: var(--color-control-border-hover);
		box-shadow: var(--shadow-control-hover);
	}

	.theme-toggle:focus-visible {
		outline: 3px solid var(--color-focus-ring);
		outline-offset: 3px;
	}

	.theme-toggle:active {
		background: var(--color-control-pressed);
		transform: scale(0.92);
	}

	.theme-toggle svg {
		position: absolute;
		width: 21px;
		height: 21px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition:
			opacity 0.25s ease,
			transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.moon-icon {
		opacity: 0;
		transform: rotate(-35deg) scale(0.65);
	}

	:global(html[data-theme='dark']) .sun-icon {
		opacity: 0;
		transform: rotate(55deg) scale(0.65);
	}

	:global(html[data-theme='dark']) .moon-icon {
		opacity: 1;
		transform: rotate(0deg) scale(1);
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-toggle,
		.theme-toggle svg {
			transition: none;
		}
	}
</style>
