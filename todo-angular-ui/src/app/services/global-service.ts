import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
	CreateTodoDto,
	PatchTodoDto,
	PatchUserDto,
	SignInDto,
	SignUpDto,
	TodoDto,
	UpdateTodoDto,
	UpdateUserDto,
	UserDto
} from '../types/types';

@Injectable({
	providedIn: 'root'
})
export class GlobalService {
	private readonly http = inject(HttpClient);

	signIn(dto: SignInDto) {
		return this.http.post<UserDto>('/api/signin', dto);
	}

	signUp(dto: SignUpDto) {
		return this.http.post('/api/signup', dto);
	}

	signOut() {
		return this.http.post('/api/signout', {});
	}

	getUser() {
		return this.http.get<UserDto>('/api/user');
	}

	deleteUser() {
		return this.http.delete('/api/user');
	}

	patchUser(dto: PatchUserDto) {
		return this.http.patch('/api/user', dto);
	}

	updateUser(dto: UpdateUserDto) {
		return this.http.put('/api/user', dto);
	}

	getTodos() {
		return this.http.get<TodoDto[]>('/api/todos');
	}

	createTodo(dto: CreateTodoDto) {
		return this.http.post('/api/todos', dto);
	}

	updateTodo(id: number, dto: UpdateTodoDto) {
		return this.http.put(`/api/todos/${id.toString()}`, dto);
	}

	patchTodo(id: number, dto: PatchTodoDto) {
		return this.http.patch(`/api/todos/${id.toString()}`, dto);
	}

	deleteTodo(id: number) {
		return this.http.delete(`/api/todos/${id.toString()}`);
	}
}
