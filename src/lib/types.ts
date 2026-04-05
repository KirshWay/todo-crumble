import type Matter from 'matter-js';

export type Todo = {
	id: string;
	text: string;
};

export type FallingLetter = {
	id: string;
	char: string;
	body: Matter.Body;
	fontSize: number;
};

export type DropLettersApi = {
	dropLetters: (text: string, x: number, y: number) => void;
};
