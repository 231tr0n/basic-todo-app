import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { AppConfiguration } from '../config/app-configuration';
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

@Service()
export class GlobalApi {
	private readonly http = inject(HttpClient);
	private readonly configuration = inject(AppConfiguration);
	private readonly httpOptions = { withCredentials: true };

	readonly loggedInUser = new BehaviorSubject<UserDto | null>(null);
	private userRequestId = 0;

	constructor() {
		this.refreshLoggedInUser();
	}

	refreshLoggedInUser(): void {
		const requestId = ++this.userRequestId;
		this.getUser().subscribe({
			next: (user) => {
				if (requestId === this.userRequestId) {
					this.loggedInUser.next(user);
				}
			},
			error: () => {
				if (requestId === this.userRequestId) {
					this.loggedInUser.next(null);
				}
			}
		});
	}

	clearLoggedInUser(): void {
		this.userRequestId += 1;
		this.loggedInUser.next(null);
	}

	private get baseUrl(): string {
		return this.configuration.apiBaseUrl;
	}

	private get currentUserId(): number {
		return this.configuration.currentUserId;
	}

	signIn(dto: SignInDto) {
		return this.http.post(`${this.baseUrl}/signin`, dto, this.httpOptions).pipe(
			tap(() => {
				this.refreshLoggedInUser();
			})
		);
	}

	signUp(dto: SignUpDto) {
		return this.http.post(`${this.baseUrl}/signup`, dto, this.httpOptions);
	}

	signOut() {
		return this.http.post(`${this.baseUrl}/signout`, {}, this.httpOptions).pipe(
			tap(() => {
				this.clearLoggedInUser();
			})
		);
	}

	getUser(userId?: number) {
		return this.http.get<UserDto>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}`,
			this.httpOptions
		);
	}

	getUsers() {
		return this.http.get<UserDto[]>(`${this.baseUrl}/users`, this.httpOptions);
	}

	updateUser(dto: UpdateUserDto, userId?: number) {
		return this.http.put(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}`,
			dto,
			this.httpOptions
		);
	}

	patchUser(dto: PatchUserDto, userId?: number) {
		return this.http.patch(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}`,
			dto,
			this.httpOptions
		);
	}

	deleteUser(userId?: number) {
		return this.http.delete(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}`,
			this.httpOptions
		);
	}

	getTodo(todoId: number, userId?: number) {
		return this.http.get<TodoDto>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			this.httpOptions
		);
	}

	getTodos(userId?: number) {
		return this.http.get<TodoDto[]>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos`,
			this.httpOptions
		);
	}

	createTodo(dto: CreateTodoDto, userId?: number) {
		return this.http.post<TodoDto>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos`,
			dto,
			this.httpOptions
		);
	}

	updateTodo(dto: UpdateTodoDto, todoId: number, userId?: number) {
		return this.http.put(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			dto,
			this.httpOptions
		);
	}

	patchTodo(dto: PatchTodoDto, todoId: number, userId?: number) {
		return this.http.patch(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			dto,
			this.httpOptions
		);
	}

	deleteTodo(todoId: number, userId?: number) {
		return this.http.delete(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos/${todoId.toString()}`,
			this.httpOptions
		);
	}

	deleteTodos(userId?: number) {
		return this.http.delete(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos`,
			this.httpOptions
		);
	}
}
