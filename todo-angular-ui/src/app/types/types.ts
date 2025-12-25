export interface UpdateUserDto {
	username?: string;
	authorities?: string[];
}

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

export interface UserDto {
	id: number;
	username: string;
	authorities: string[];
}

export interface PatchUserDto {
	oldPassword: string;
	newPassword: string;
}

export interface PatchTodoDto {
	status: string;
}

export interface TodoDto {
	id: number;
	title: string;
	description: string;
	status: string;
}
