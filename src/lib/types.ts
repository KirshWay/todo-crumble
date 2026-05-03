import type Matter from 'matter-js';

export type Todo = {
	id: string;
	text: string;
};

export type CompletedTodo = {
	todo: Todo;
	index: number;
};

export type FallingLetter = {
	id: string;
	groupId: string;
	char: string;
	body: Matter.Body;
	fontSize: number;
	targetX: number;
	targetY: number;
	restore?: {
		startedAt: number;
		delay: number;
		duration: number;
		fromX: number;
		fromY: number;
		fromAngle: number;
		popX: number;
		popY: number;
		progress: number;
	};
};

export type DropLettersApi = {
	dropLetters: (completed: CompletedTodo, element: HTMLElement) => void;
};
