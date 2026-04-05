<script lang="ts">
	import { onMount } from 'svelte';
	import type { Action } from 'svelte/action';
	import type { FallingLetter, DropLettersApi } from '$lib/types';
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
	};

	let { onReady }: Props = $props();

	const FONT_SIZE = 18;
	const FONT_FAMILY = "'Helvetica Neue', Arial, sans-serif";
	const MAX_LETTERS = 500;

	let letters = $state.raw<FallingLetter[]>([]);

	let allLetters: FallingLetter[] = [];
	let letterElements = new Map<string, HTMLSpanElement>();

	let engine: Matter.Engine;
	let boundaryBodies: Matter.Body[] = [];

	let figureElement: SVGSVGElement | null = null;
	let leftArmEl: SVGLineElement | null = null;
	let rightArmEl: SVGLineElement | null = null;
	let leftLegEl: SVGLineElement | null = null;
	let rightLegEl: SVGLineElement | null = null;

	let figureX = 0;
	let figureY = 0;
	let figureTargetX = 0;
	let figureTargetY = 0;
	let figureVisible = false;
	let walkPhase = 0;

	const FIGURE_SPEED = 1.5;
	const SETTLED_SPEED = 1.0;
	const WALK_SPEED = 0.12;
	const WALK_THRESHOLD = 1.0;

	const pruneOldLetters = () => {
		if (allLetters.length <= MAX_LETTERS) return;

		const excessCount = allLetters.length - MAX_LETTERS;
		const sleeping = allLetters.filter((l) => l.body.isSleeping);
		const toRemove = sleeping.slice(0, excessCount);

		for (const l of toRemove) {
			removeBodyFromWorld(engine, l.body);
			letterElements.delete(l.id);
		}

		const removeSet = new Set(toRemove);
		allLetters = allLetters.filter((l) => !removeSet.has(l));
		letters = allLetters;
	};

	const dropLetters = (text: string, originX: number, originY: number) => {
		const newLetters: FallingLetter[] = [];
		let xOffset = 0;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			if (char === ' ') {
				xOffset += FONT_SIZE * 0.3;
				continue;
			}

			const measured = measureChar(char, FONT_SIZE, FONT_FAMILY);
			const x = originX + xOffset + measured.width / 2;
			const y = originY + FONT_SIZE / 2;

			const body = createLetterBody(x, y, measured.width, measured.height);
			newLetters.push({
				id: crypto.randomUUID(),
				char,
				body,
				fontSize: FONT_SIZE
			});

			xOffset += measured.width;
		}

		addBodiesToWorld(
			engine,
			newLetters.map((l) => l.body)
		);

		allLetters = [...allLetters, ...newLetters];
		letters = allLetters;

		pruneOldLetters();
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

		for (const letter of allLetters) {
				if (letter.body.isSleeping) continue;

				const el = letterElements.get(letter.id);
				if (el) {
					const { x: bx, y: by } = letter.body.position;
					const angle = letter.body.angle;
					const halfW = letter.fontSize * 0.3;
					const halfH = letter.fontSize * 0.5;
					el.style.transform = `translate(${bx - halfW}px, ${by - halfH}px) rotate(${angle}rad)`;
				}
			}

		let peakY = Infinity;
			let peakX = 0;
			let hasSettled = false;

			for (const letter of allLetters) {
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
		<circle cx="12" cy="5" r="4" fill="#222" stroke="none" />
		<line x1="12" y1="9" x2="12" y2="30" />
		<line bind:this={leftArmEl} x1="12" y1="16" x2="3" y2="24" />
		<line bind:this={rightArmEl} x1="12" y1="16" x2="21" y2="24" />
		<line bind:this={leftLegEl} x1="12" y1="30" x2="4" y2="44" />
		<line bind:this={rightLegEl} x1="12" y1="30" x2="20" y2="44" />
	</svg>
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
		color: #222;
		line-height: 1;
		will-change: transform;
	}

	.stick-figure {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		stroke: #222;
		fill: none;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: opacity 0.3s ease;
		will-change: transform, opacity;
		z-index: 1;
	}
</style>
