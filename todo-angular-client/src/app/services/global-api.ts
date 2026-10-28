import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

	private userPath(userId?: number): string {
		return `${this.baseUrl}/users/${(userId ?? this.configuration.currentUserAliasId).toString()}`;
	}

	private todosPath(userId?: number): string {
		return `${this.userPath(userId)}/todos`;
	}

	private todoPath(todoId: number, userId?: number): string {
		return `${this.todosPath(userId)}/${todoId.toString()}`;
	}

	signIn(dto: SignInDto): Observable<null> {
		return this.http.post<null>(`${this.baseUrl}/signin`, dto, this.httpOptions).pipe(
			tap(() => {
				this.refreshLoggedInUser();
			})
		);
	}

	signUp(dto: SignUpDto): Observable<null> {
		return this.http.post<null>(`${this.baseUrl}/signup`, dto, this.httpOptions);
	}

	signOut(): Observable<null> {
		return this.http.post<null>(`${this.baseUrl}/signout`, {}, this.httpOptions).pipe(
			tap(() => {
				this.clearLoggedInUser();
			})
		);
	}

	getUser(userId?: number): Observable<UserDto> {
		return this.http.get<UserDto>(this.userPath(userId), this.httpOptions);
	}

	getUsers(): Observable<UserDto[]> {
		return this.http.get<UserDto[]>(`${this.baseUrl}/users`, this.httpOptions);
	}

	updateUser(dto: UpdateUserDto, userId?: number): Observable<null> {
		return this.http.put<null>(this.userPath(userId), dto, this.httpOptions);
	}

	patchUser(dto: PatchUserDto, userId?: number): Observable<null> {
		return this.http.patch<null>(this.userPath(userId), dto, this.httpOptions);
	}

	deleteUser(userId?: number): Observable<null> {
		return this.http.delete<null>(this.userPath(userId), this.httpOptions);
	}

	getTodo(todoId: number, userId?: number): Observable<TodoDto> {
		return this.http.get<TodoDto>(this.todoPath(todoId, userId), this.httpOptions);
	}

	getTodos(userId?: number): Observable<TodoDto[]> {
		return this.http.get<TodoDto[]>(this.todosPath(userId), this.httpOptions);
	}

	createTodo(dto: CreateTodoDto, userId?: number): Observable<TodoDto> {
		return this.http.post<TodoDto>(this.todosPath(userId), dto, this.httpOptions);
	}

	updateTodo(dto: UpdateTodoDto, todoId: number, userId?: number): Observable<null> {
		return this.http.put<null>(this.todoPath(todoId, userId), dto, this.httpOptions);
	}

	patchTodo(dto: PatchTodoDto, todoId: number, userId?: number): Observable<null> {
		return this.http.patch<null>(this.todoPath(todoId, userId), dto, this.httpOptions);
	}

	deleteTodo(todoId: number, userId?: number): Observable<null> {
		return this.http.delete<null>(this.todoPath(todoId, userId), this.httpOptions);
	}

	deleteTodos(userId?: number): Observable<null> {
		return this.http.delete<null>(this.todosPath(userId), this.httpOptions);
	}
}
