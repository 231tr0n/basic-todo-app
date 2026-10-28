export interface UpdateTodoDto {
	title?: string;
	description?: string;
}

export interface CreateTodoDto {
	title: string;
	description: string;
}

export interface SignUpDto {
	username: string;
	password: string;
	authorities?: string[];
}

export interface SignInDto {
	username: string;
	password: string;
}

export interface UpdateUserDto {
	username?: string;
	authorities?: string[];
}

export interface PatchUserDto {
	oldPassword: string;
	newPassword: string;
}

export interface UserDto {
	id: number;
	username: string;
	authorities: string[];
}

export interface PatchTodoDto {
	status: TodoStatus;
}

export interface TodoDto {
	id: number;
	title: string;
	description: string;
	status: TodoStatus;
}

export const TODO_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

export interface TodoColumn {
	readonly status: TodoStatus;
	readonly title: string;
	readonly icon: string;
	readonly accent: string;
}

export const TODO_COLUMNS: readonly TodoColumn[] = [
	{ status: 'NOT_STARTED', title: 'To do', icon: 'radio_button_unchecked', accent: 'todo' },
	{
		status: 'IN_PROGRESS',
		title: 'In progress',
		icon: 'pending',
		accent: 'progress'
	},
	{ status: 'COMPLETED', title: 'Done', icon: 'check_circle', accent: 'done' }
];

export function isTodoStatus(value: string): value is TodoStatus {
	return (TODO_STATUSES as readonly string[]).includes(value);
}
