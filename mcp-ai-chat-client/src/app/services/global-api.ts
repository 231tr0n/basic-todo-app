import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
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
import { BehaviorSubject, tap } from 'rxjs';
import { AppConfiguration } from '../config/app-configuration';

@Service()
export class GlobalApi {
	private readonly http = inject(HttpClient);
	private readonly configuration = inject(AppConfiguration);

	readonly loggedInUser = new BehaviorSubject<UserDto | null>(null);

	constructor() {
		this.refreshLoggedInUser();
	}

	private refreshLoggedInUser() {
		this.getUser().subscribe({
			next: (user) => {
				this.loggedInUser.next(user);
			},
			error: () => {
				this.loggedInUser.next(null);
			}
		});
	}

	private get baseUrl() {
		return this.configuration.apiBaseUrl;
	}

	private get currentUserId() {
		return this.configuration.currentUserId;
	}

	signIn(dto: SignInDto) {
		return this.http
			.post(`${this.baseUrl}/signin`, dto, {
				withCredentials: true
			})
			.pipe(
				tap(() => {
					this.refreshLoggedInUser();
				})
			);
	}

	signUp(dto: SignUpDto) {
		return this.http.post(`${this.baseUrl}/signup`, dto, {
			withCredentials: true
		});
	}

	signOut() {
		return this.http
			.post(
				`${this.baseUrl}/signout`,
				{},
				{
					withCredentials: true
				}
			)
			.pipe(
				tap(() => {
					this.loggedInUser.next(null);
				})
			);
	}

	getUsers() {
		return this.http.get<UserDto[]>(`${this.baseUrl}/users`, {
			withCredentials: true
		});
	}

	getUser(userId?: number) {
		return this.http.get<UserDto>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}`,
			{
				withCredentials: true
			}
		);
	}

	deleteUser(userId?: number) {
		const targetUserId = userId ?? this.currentUserId;
		const request = this.http.delete(`${this.baseUrl}/users/${targetUserId.toString()}`, {
			withCredentials: true
		});
		if (targetUserId === this.currentUserId) {
			return request.pipe(
				tap(() => {
					this.loggedInUser.next(null);
				})
			);
		}
		return request;
	}

	patchUser(dto: PatchUserDto, userId?: number) {
		return this.http.patch(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}`,
			dto,
			{
				withCredentials: true
			}
		);
	}

	updateUser(dto: UpdateUserDto, userId?: number) {
		const targetUserId = userId ?? this.currentUserId;
		const request = this.http.put(`${this.baseUrl}/users/${targetUserId.toString()}`, dto, {
			withCredentials: true
		});
		if (targetUserId === this.currentUserId) {
			return request.pipe(
				tap(() => {
					this.refreshLoggedInUser();
				})
			);
		}
		return request;
	}

	getTodos(userId?: number) {
		return this.http.get<TodoDto[]>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos`,
			{
				withCredentials: true
			}
		);
	}

	getTodo(todoId: number, userId?: number) {
		return this.http.get<TodoDto>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			{
				withCredentials: true
			}
		);
	}

	createTodo(dto: CreateTodoDto, userId?: number) {
		return this.http.post(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos`,
			dto,
			{
				withCredentials: true
			}
		);
	}

	updateTodo(dto: UpdateTodoDto, todoId: number, userId?: number) {
		return this.http.put(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			dto,
			{
				withCredentials: true
			}
		);
	}

	patchTodo(dto: PatchTodoDto, todoId: number, userId?: number) {
		return this.http.patch(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			dto,
			{
				withCredentials: true
			}
		);
	}

	deleteTodo(todoId: number, userId?: number) {
		return this.http.delete(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			{
				withCredentials: true
			}
		);
	}

	deleteTodos(userId?: number) {
		return this.http.delete(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos`,
			{
				withCredentials: true
			}
		);
	}
}
