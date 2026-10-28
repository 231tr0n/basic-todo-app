import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
	CreateTodoDto,
	PatchTodoDto,
	SignInDto,
	SignUpDto,
	TodoDto,
	UpdateTodoDto,
	UserDto
} from '../types/types';
import { BehaviorSubject, tap } from 'rxjs';
import { AppConfiguration } from '../config/app-configuration';

@Service()
export class GlobalApi {
	private readonly http = inject(HttpClient);
	private readonly configuration = inject(AppConfiguration);

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
					this.clearLoggedInUser();
				})
			);
	}

	getUser(userId?: number) {
		return this.http.get<UserDto>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}`,
			{
				withCredentials: true
			}
		);
	}

	getTodos(userId?: number) {
		return this.http.get<TodoDto[]>(
			`${this.baseUrl}/users/${(userId ?? this.currentUserId).toString()}/todos`,
			{
				withCredentials: true
			}
		);
	}

	createTodo(dto: CreateTodoDto, userId?: number) {
		return this.http.post<TodoDto>(
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
}
