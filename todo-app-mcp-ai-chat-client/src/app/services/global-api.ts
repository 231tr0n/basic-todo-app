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
import { Session } from './session';
import { tap } from 'rxjs';
import { BASE_URL, CURRENT_USER_ID } from '../constants';

@Injectable({
	providedIn: 'root'
})
export class GlobalApi {
	private readonly http = inject(HttpClient);
	private readonly session = inject(Session);

	signIn(dto: SignInDto) {
		return this.http.post<UserDto>(`${BASE_URL}/signin`, dto).pipe(
			tap((value) => {
				this.session.loggedInUser.next(value);
			})
		);
	}

	signUp(dto: SignUpDto) {
		return this.http.post(`${BASE_URL}/signup`, dto, {
			withCredentials: true
		});
	}

	signOut() {
		return this.http
			.post(
				`${BASE_URL}/signout`,
				{},
				{
					withCredentials: true
				}
			)
			.pipe(
				tap(() => {
					this.session.loggedInUser.next(null);
				})
			);
	}

	getUsers() {
		return this.http.get<UserDto[]>(`${BASE_URL}/users`, {
			withCredentials: true
		});
	}

	getUser(userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.get<UserDto>(`${BASE_URL}/users/${userId.toString()}`, {
			withCredentials: true
		});
	}

	deleteUser(userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		const subscription = this.http.delete(`${BASE_URL}/users/${userId.toString()}`, {
			withCredentials: true
		});
		if (userId === CURRENT_USER_ID) {
			return subscription.pipe(
				tap(() => {
					this.session.loggedInUser.next(null);
				})
			);
		}
		return subscription;
	}

	patchUser(dto: PatchUserDto, userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.patch(`${BASE_URL}/users/${userId.toString()}`, dto, {
			withCredentials: true
		});
	}

	updateUser(dto: UpdateUserDto, userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		const subscription = this.http.put(`${BASE_URL}/users/${userId.toString()}`, dto, {
			withCredentials: true
		});
		if (userId === CURRENT_USER_ID) {
			return subscription.pipe(
				tap(() => {
					this.getUser().subscribe();
				})
			);
		}
		return subscription;
	}

	getTodos(userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.get<TodoDto[]>(`${BASE_URL}/users/${userId.toString()}/todos`, {
			withCredentials: true
		});
	}

	getTodo(todoId: number, userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.get<TodoDto>(
			`${BASE_URL}/users/${userId.toString()}/todos/${todoId.toString()}`,
			{
				withCredentials: true
			}
		);
	}

	createTodo(dto: CreateTodoDto, userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.post(`${BASE_URL}/users/${userId.toString()}/todos`, dto, {
			withCredentials: true
		});
	}

	updateTodo(dto: UpdateTodoDto, todoId: number, userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.put(`${BASE_URL}/users/${userId.toString()}/todos/${todoId.toString()}`, dto, {
			withCredentials: true
		});
	}

	patchTodo(dto: PatchTodoDto, todoId: number, userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.patch(
			`${BASE_URL}/users/${userId.toString()}/todos/${todoId.toString()}`,
			dto,
			{
				withCredentials: true
			}
		);
	}

	deleteTodo(todoId: number, userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.delete(`${BASE_URL}/users/${userId.toString()}/todos/${todoId.toString()}`, {
			withCredentials: true
		});
	}

	deleteTodos(userId?: number) {
		userId = userId ?? CURRENT_USER_ID;
		return this.http.delete(`${BASE_URL}/users/${userId.toString()}/todos`, {
			withCredentials: true
		});
	}
}
