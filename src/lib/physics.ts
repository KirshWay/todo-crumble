import Matter from 'matter-js';

const { Engine, Bodies, Composite, Body } = Matter;

const LETTER_RESTITUTION = 0.1;
const LETTER_FRICTION = 0.8;
const LETTER_AIR_FRICTION = 0.03;
const LETTER_DENSITY = 0.002;
const LETTER_SLEEP_THRESHOLD = 60;
const GROUND_FRICTION = 1;

export const createPhysicsEngine = (): Matter.Engine => {
	return Engine.create({
		gravity: { x: 0, y: 1, scale: 0.001 },
		enableSleeping: true
	});
};

export const createBoundaries = (
	engine: Matter.Engine,
	width: number,
	height: number
): Matter.Body[] => {
	const ground = Bodies.rectangle(width / 2, height + 25, width + 200, 50, {
		isStatic: true,
		friction: GROUND_FRICTION
	});
	const leftWall = Bodies.rectangle(-25, height / 2, 50, height * 2, {
		isStatic: true
	});
	const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height * 2, {
		isStatic: true
	});

	const boundaries = [ground, leftWall, rightWall];
	Composite.add(engine.world, boundaries);
	return boundaries;
};

export const updateBoundaries = (
	engine: Matter.Engine,
	oldBodies: Matter.Body[],
	width: number,
	height: number
): Matter.Body[] => {
	Composite.remove(engine.world, oldBodies);
	return createBoundaries(engine, width, height);
};

export const createLetterBody = (
	x: number,
	y: number,
	charWidth: number,
	charHeight: number
): Matter.Body => {
	const body = Bodies.rectangle(x, y, charWidth, charHeight, {
		restitution: LETTER_RESTITUTION,
		friction: LETTER_FRICTION,
		frictionAir: LETTER_AIR_FRICTION,
		density: LETTER_DENSITY,
		angle: (Math.random() - 0.5) * 0.5,
		sleepThreshold: LETTER_SLEEP_THRESHOLD
	});

	Body.setVelocity(body, {
		x: (Math.random() - 0.5) * 8,
		y: Math.random() * 2 + 1
	});

	Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);

	return body;
};

export const addBodiesToWorld = (engine: Matter.Engine, bodies: Matter.Body[]): void => {
	Composite.add(engine.world, bodies);
};

export const removeBodyFromWorld = (engine: Matter.Engine, body: Matter.Body): void => {
	Composite.remove(engine.world, body);
};

export const stepEngine = (engine: Matter.Engine, delta?: number): void => {
	Engine.update(engine, delta ?? 1000 / 60);
};

export const destroyEngine = (engine: Matter.Engine): void => {
	Composite.clear(engine.world, false);
	Engine.clear(engine);
};

let measureCanvas: HTMLCanvasElement | null = null;

export const measureChar = (
	char: string,
	fontSize: number,
	fontFamily: string
): { width: number; height: number } => {
	if (!measureCanvas) {
		measureCanvas = document.createElement('canvas');
	}
	const ctx = measureCanvas.getContext('2d')!;
	ctx.font = `${fontSize}px ${fontFamily}`;
	const metrics = ctx.measureText(char);
	return {
		width: Math.max(metrics.width, 4),
		height: fontSize
	};
};
