<script lang="ts">
	import { onMount } from 'svelte';
	import type { Action } from 'svelte/action';
	import type { CompletedTodo, FallingLetter, DropLettersApi } from '$lib/types';
	import {
		createPhysicsEngine,
		createBoundaries,
		updateBoundaries,
		createLetterBody,
		addBodiesToWorld,
		removeBodyFromWorld,
		stepEngine,
		destroyEngine,
		measureChar
	} from '$lib/physics';

	type Props = {
		onReady: (api: DropLettersApi) => void;
		onPrepareRestore: (completed: CompletedTodo) => Promise<HTMLElement | null>;
		onRestoreComplete: (completed: CompletedTodo) => void;
	};

	let { onReady, onPrepareRestore, onRestoreComplete }: Props = $props();

	const FONT_SIZE = 18;
	const FONT_FAMILY = "'Helvetica Neue', Arial, sans-serif";
	const MAX_LETTERS = 500;
	const RESTORE_DURATION = 1120;
	const RESTORE_STAGGER = 22;

	type RestoreLine = {
		id: string;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		opacity: number;
	};

	let letters = $state.raw<FallingLetter[]>([]);
	let restoreLines = $state.raw<RestoreLine[]>([]);

	let allLetters: FallingLetter[] = [];
	let letterElements = new Map<string, HTMLSpanElement>();
	let completedGroups = new Map<
		string,
		CompletedTodo & {
			restoring: boolean;
		}
	>();

	let engine: Matter.Engine;
	let boundaryBodies: Matter.Body[] = [];

	let figureElement: SVGSVGElement | null = null;
	let leftArmEl: SVGLineElement | null = null;
	let rightArmEl: SVGLineElement | null = null;
	let leftLegEl: SVGLineElement | null = null;
	let rightLegEl: SVGLineElement | null = null;
	let restoreButtonElement: HTMLButtonElement | null = null;

	let figureX = 0;
	let figureY = 0;
	let figureTargetX = 0;
	let figureTargetY = 0;
	let figureVisible = false;
	let walkPhase = 0;
	let restoreButtonVisible = false;

	const FIGURE_SPEED = 1.5;
	const SETTLED_SPEED = 1.0;
	const WALK_SPEED = 0.12;
	const WALK_THRESHOLD = 1.0;

	const pruneOldLetters = () => {
		if (allLetters.length <= MAX_LETTERS) return;

		const excessCount = allLetters.length - MAX_LETTERS;
		const sleeping = allLetters.filter((l) => l.body.isSleeping);
		const removeGroupIds = new Set(sleeping.slice(0, excessCount).map((letter) => letter.groupId));
		const toRemove = allLetters.filter((letter) => removeGroupIds.has(letter.groupId));

		for (const l of toRemove) {
			removeBodyFromWorld(engine, l.body);
			letterElements.delete(l.id);
		}

		const removeSet = new Set(toRemove);
		allLetters = allLetters.filter((l) => !removeSet.has(l));
		letters = allLetters;

		for (const groupId of removeGroupIds) {
			completedGroups.delete(groupId);
		}
	};

	const measureLetterTargets = (element: HTMLElement) => {
		const textNode = element.firstChild;
		const targets: { char: string; x: number; y: number }[] = [];

		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
			const rect = element.getBoundingClientRect();
			let xOffset = 0;

			for (const char of element.textContent ?? '') {
				if (char === ' ') {
					xOffset += FONT_SIZE * 0.3;
					continue;
				}

				const measured = measureChar(char, FONT_SIZE, FONT_FAMILY);
				targets.push({
					char,
					x: rect.left + xOffset + measured.width / 2,
					y: rect.top + FONT_SIZE / 2
				});
				xOffset += measured.width;
			}

			return targets;
		}

		const text = textNode.textContent ?? '';

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			if (char === ' ') continue;

			const range = document.createRange();
			range.setStart(textNode, i);
			range.setEnd(textNode, i + 1);
			const rect = range.getBoundingClientRect();
			range.detach();

			if (rect.width === 0 && rect.height === 0) continue;

			targets.push({
				char,
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2
			});
		}

		return targets;
	};

	const dropLetters = (completed: CompletedTodo, element: HTMLElement) => {
		const newLetters: FallingLetter[] = [];
		const groupId = crypto.randomUUID();
		const targets = measureLetterTargets(element);

		for (const target of targets) {
			const { char } = target;
			const measured = measureChar(char, FONT_SIZE, FONT_FAMILY);

			const body = createLetterBody(target.x, target.y, measured.width, measured.height);
			newLetters.push({
				id: crypto.randomUUID(),
				groupId,
				char,
				body,
				fontSize: FONT_SIZE,
				targetX: target.x,
				targetY: target.y
			});
		}

		if (newLetters.length === 0) return;

		addBodiesToWorld(
			engine,
			newLetters.map((l) => l.body)
		);

		allLetters = [...allLetters, ...newLetters];
		letters = allLetters;
		completedGroups.set(groupId, {
			...completed,
			restoring: false
		});

		pruneOldLetters();
	};

	const getRestorableGroup = () => {
		const groups = [...completedGroups.entries()].filter(([, group]) => !group.restoring);
		return groups.at(-1) ?? null;
	};

	const restoreLatestGroup = async () => {
		const restorableGroup = getRestorableGroup();
		if (!restorableGroup) return;

		const [groupId, group] = restorableGroup;

		group.restoring = true;
		restoreButtonVisible = false;

		const targetElement = await onPrepareRestore({ todo: group.todo, index: group.index });
		if (!targetElement) {
			group.restoring = false;
			return;
		}

		const targets = measureLetterTargets(targetElement);
		const groupLetters = allLetters.filter((letter) => letter.groupId === groupId);
		const now = performance.now();
		const randomizedOrder = groupLetters
			.map((letter, index) => ({ letter, index, sort: Math.random() }))
			.toSorted((a, b) => a.sort - b.sort);
		const delayByLetterId = new Map(
			randomizedOrder.map(({ letter }, order) => [letter.id, order * RESTORE_STAGGER])
		);

		for (let i = 0; i < groupLetters.length; i++) {
			const letter = groupLetters[i];
			const target = targets[i];

			if (target) {
				letter.targetX = target.x;
				letter.targetY = target.y;
			}

			const drift = i - (groupLetters.length - 1) / 2;
			const popX = letter.targetX + drift * 1.2 + (Math.random() - 0.5) * 44;
			const popY =
				letter.targetY +
				120 +
				Math.sin(i * 0.9) * 34 +
				(Math.random() - 0.5) * 52;

			removeBodyFromWorld(engine, letter.body);
			letter.restore = {
				startedAt: now,
				delay: delayByLetterId.get(letter.id) ?? 0,
				duration: RESTORE_DURATION,
				fromX: letter.body.position.x,
				fromY: letter.body.position.y,
				fromAngle: letter.body.angle,
				popX,
				popY,
				progress: 0
			};
		}

		letters = allLetters;
	};

	const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
	const easeInOutCubic = (t: number) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	const easeOutBack = (t: number) => {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
	};

	const getRestoredPosition = (letter: FallingLetter, progress: number) => {
		const restore = letter.restore!;
		const popPhaseEnd = 0.42;

		if (progress < popPhaseEnd) {
			const localProgress = easeOutBack(progress / popPhaseEnd);
			const hop = Math.sin(Math.min(progress / popPhaseEnd, 1) * Math.PI) * 42;

			return {
				x: restore.fromX + (restore.popX - restore.fromX) * localProgress,
				y: restore.fromY + (restore.popY - restore.fromY) * localProgress - hop,
				angle: restore.fromAngle + (Math.sin(progress * Math.PI * 4) * 0.45 - restore.fromAngle) * 0.55
			};
		}

		const settleProgress = (progress - popPhaseEnd) / (1 - popPhaseEnd);
		const localProgress = Math.min(easeOutBack(settleProgress), 1.06);
		const bounceProgress = Math.max(0, (settleProgress - 0.7) / 0.3);
		const hop =
			Math.sin(settleProgress * Math.PI) * 34 +
			Math.sin(Math.min(bounceProgress, 1) * Math.PI) * 12;

		return {
			x: restore.popX + (letter.targetX - restore.popX) * localProgress,
			y: restore.popY + (letter.targetY - restore.popY) * localProgress - hop,
			angle: restore.fromAngle * (1 - progress)
		};
	};

	const renderLetter = (letter: FallingLetter, x: number, y: number, angle: number) => {
		const el = letterElements.get(letter.id);
		if (!el) return;

		const halfW = letter.fontSize * 0.3;
		const halfH = letter.fontSize * 0.5;
		el.style.transform = `translate(${x - halfW}px, ${y - halfH}px) rotate(${angle}rad)`;
	};

	const buildRestoreLines = () => {
		const nextLines: RestoreLine[] = [];
		const restoringGroupIds = new Set(allLetters.filter((letter) => letter.restore).map((letter) => letter.groupId));

		for (const groupId of restoringGroupIds) {
			const groupLetters = allLetters.filter((letter) => letter.groupId === groupId && letter.restore);

			for (let i = 0; i < groupLetters.length - 1; i++) {
				const current = groupLetters[i];
				const next = groupLetters[i + 1];
				const currentRestore = current.restore!;
				const nextRestore = next.restore!;

				if (currentRestore.progress <= 0 || nextRestore.progress <= 0) continue;

				const currentPosition = getRestoredPosition(current, currentRestore.progress);
				const nextPosition = getRestoredPosition(next, nextRestore.progress);
				const distance = Math.hypot(
					nextPosition.x - currentPosition.x,
					nextPosition.y - currentPosition.y
				);

				if (distance > 125) continue;

				const currentLineProgress = easeInOutCubic(currentRestore.progress);
				const nextLineProgress = easeInOutCubic(nextRestore.progress);
				const opacity =
					Math.min(currentLineProgress, nextLineProgress) *
					(1 - Math.max(currentLineProgress, nextLineProgress) * 0.18) *
					(1 - distance / 145);

				nextLines.push({
					id: `${current.id}-${next.id}`,
					x1: currentPosition.x,
					y1: currentPosition.y,
					x2: nextPosition.x,
					y2: nextPosition.y,
					opacity: Math.max(0, Math.min(opacity, 0.34))
				});
			}
		}

		restoreLines = nextLines;
	};

	const letterAction: Action<HTMLSpanElement, () => string> = (node, getLetterId) => {
		const id = getLetterId!();
		letterElements.set(id, node);
		return {
			destroy: () => {
				letterElements.delete(id);
			}
		};
	};

	onMount(() => {
		engine = createPhysicsEngine();
		boundaryBodies = createBoundaries(engine, window.innerWidth, window.innerHeight);

		onReady({ dropLetters });

		let animationId: number;

		const loop = () => {
			stepEngine(engine);

			const now = performance.now();
			const restoredGroupIds = new Set<string>();

			for (const letter of allLetters) {
				if (!letter.restore) continue;

				const elapsed = now - letter.restore.startedAt - letter.restore.delay;
				const rawProgress = Math.max(0, Math.min(elapsed / letter.restore.duration, 1));
				const position = getRestoredPosition(letter, rawProgress);

				letter.restore.progress = rawProgress;
				renderLetter(letter, position.x, position.y, position.angle);

				if (rawProgress >= 1) {
					const groupLetters = allLetters.filter((l) => l.groupId === letter.groupId);
					if (groupLetters.every((l) => l.restore)) {
						const allDone = groupLetters.every((l) => {
							const restore = l.restore!;
							return now - restore.startedAt - restore.delay >= restore.duration;
						});

						if (allDone) restoredGroupIds.add(letter.groupId);
					}
				}
			}

			for (const groupId of restoredGroupIds) {
				const group = completedGroups.get(groupId);
				if (!group) continue;

				for (const letter of allLetters.filter((l) => l.groupId === groupId)) {
					letterElements.delete(letter.id);
				}

				allLetters = allLetters.filter((letter) => letter.groupId !== groupId);
				letters = allLetters;
				completedGroups.delete(groupId);
				onRestoreComplete({ todo: group.todo, index: group.index });
			}

			buildRestoreLines();

			for (const letter of allLetters) {
				if (letter.restore) continue;
				if (letter.body.isSleeping) continue;

				const { x: bx, y: by } = letter.body.position;
				renderLetter(letter, bx, by, letter.body.angle);
			}

			let peakY = Infinity;
			let peakX = 0;
			let hasSettled = false;

			for (const letter of allLetters) {
				if (letter.restore) continue;

				if (letter.body.speed < SETTLED_SPEED && letter.body.position.y < peakY) {
					peakY = letter.body.position.y;
					peakX = letter.body.position.x;
					hasSettled = true;
				}
			}

			const shouldBeVisible = allLetters.length > 0 && hasSettled;

			let distance = 0;

			if (shouldBeVisible) {
				figureTargetX = peakX;
				figureTargetY = peakY;

				const dx = figureTargetX - figureX;
				const dy = figureTargetY - figureY;
				distance = Math.sqrt(dx * dx + dy * dy);

				if (!figureVisible) {
					figureX = figureTargetX;
					figureY = figureTargetY;
					distance = 0;
				} else if (distance > 0.5) {
					const step = Math.min(FIGURE_SPEED, distance);
					figureX += (dx / distance) * step;
					figureY += (dy / distance) * step;
				}
			}

			figureVisible = shouldBeVisible;

			const isWalking = distance > WALK_THRESHOLD;

			if (isWalking) {
				walkPhase += WALK_SPEED;
			} else {
				walkPhase *= 0.92;
				if (Math.abs(walkPhase) < 0.01) walkPhase = 0;
			}

			const swing = Math.sin(walkPhase);
			const bounce = isWalking ? Math.abs(Math.sin(walkPhase * 2)) * 1.5 : 0;
			const legSwing = swing * 6;
			const armSwing = swing * 5;

			if (figureElement) {
				figureElement.style.transform = `translate(${figureX - 10}px, ${figureY - 38 - bounce}px)`;
				figureElement.style.opacity = figureVisible ? '1' : '0';
			}

			restoreButtonVisible =
				figureVisible && getRestorableGroup() !== null && ![...completedGroups.values()].some((g) => g.restoring);

			if (restoreButtonElement) {
				restoreButtonElement.style.transform = `translate(${figureX - 13}px, ${figureY - 76 - bounce}px)`;
				restoreButtonElement.style.opacity = restoreButtonVisible ? '1' : '0';
				restoreButtonElement.style.pointerEvents = restoreButtonVisible ? 'auto' : 'none';
				restoreButtonElement.tabIndex = restoreButtonVisible ? 0 : -1;
				restoreButtonElement.setAttribute('aria-hidden', String(!restoreButtonVisible));
			}

			if (leftLegEl) leftLegEl.setAttribute('x2', String(4 + legSwing));
			if (rightLegEl) rightLegEl.setAttribute('x2', String(20 - legSwing));
			if (leftArmEl) leftArmEl.setAttribute('x2', String(3 - armSwing));
			if (rightArmEl) rightArmEl.setAttribute('x2', String(21 + armSwing));

			animationId = requestAnimationFrame(loop);
		};

		animationId = requestAnimationFrame(loop);

		const handleResize = () => {
			boundaryBodies = updateBoundaries(
				engine,
				boundaryBodies,
				window.innerWidth,
				window.innerHeight
			);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener('resize', handleResize);
			destroyEngine(engine);
		};
	});
</script>

<div class="falling-letters-container">
	<svg class="restore-lines" aria-hidden="true">
		{#each restoreLines as line (line.id)}
			<line
				x1={line.x1}
				y1={line.y1}
				x2={line.x2}
				y2={line.y2}
				opacity={line.opacity}
			/>
		{/each}
	</svg>

	{#each letters as letter (letter.id)}
		<span class="falling-letter" use:letterAction={() => letter.id}>
			{letter.char}
		</span>
	{/each}

	<svg
		bind:this={figureElement}
		class="stick-figure"
		width="20"
		height="44"
		viewBox="0 0 24 52"
		style="opacity: 0"
	>
		<circle cx="12" cy="5" r="4" fill="currentColor" stroke="none" />
		<line x1="12" y1="9" x2="12" y2="30" />
		<line bind:this={leftArmEl} x1="12" y1="16" x2="3" y2="24" />
		<line bind:this={rightArmEl} x1="12" y1="16" x2="21" y2="24" />
		<line bind:this={leftLegEl} x1="12" y1="30" x2="4" y2="44" />
		<line bind:this={rightLegEl} x1="12" y1="30" x2="20" y2="44" />
	</svg>

	<button
		bind:this={restoreButtonElement}
		class="restore-button"
		type="button"
		aria-label="Restore completed task"
		onclick={restoreLatestGroup}
	>
		<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M3 12a9 9 0 1 0 3-6.7" />
			<path d="M3 4v6h6" />
		</svg>
	</button>
</div>

<style>
	.falling-letters-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 100;
		overflow: hidden;
	}

	.falling-letter {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		user-select: none;
		font-family: 'Helvetica Neue', Arial, sans-serif;
		font-size: 18px;
		font-weight: 400;
		color: var(--color-text);
		line-height: 1;
		will-change: transform;
	}

	.restore-lines {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.restore-lines line {
		stroke: var(--color-text);
		stroke-width: 1.1;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.stick-figure {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		color: var(--color-text);
		stroke: currentColor;
		fill: none;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: opacity 0.3s ease;
		will-change: transform, opacity;
		z-index: 1;
	}

	.restore-button {
		position: absolute;
		top: 0;
		left: 0;
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: var(--color-restore-bg);
		color: var(--color-restore-icon);
		box-shadow: var(--shadow-restore);
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.2s ease,
			background 0.2s ease,
			color 0.2s ease;
		will-change: transform, opacity;
		z-index: 2;
	}

	.restore-button:hover {
		background: var(--color-restore-hover);
		color: var(--color-restore-icon-hover);
	}

	.restore-button:focus-visible {
		outline: 3px solid var(--color-focus-ring);
		outline-offset: 3px;
	}

	.restore-button:active {
		filter: brightness(0.92);
	}

	.restore-button svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@media (prefers-reduced-motion: reduce) {
		.stick-figure,
		.restore-button {
			transition: none;
		}
	}
</style>
