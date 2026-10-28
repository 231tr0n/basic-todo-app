import { computed, effect, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AppConfiguration } from '../config/app-configuration';
import {
	CreateTodoDto,
	PatchUserDto,
	SignInDto,
	SignUpDto,
	TodoColumn,
	TodoDto,
	TodoStatus,
	TODO_COLUMNS,
	UpdateTodoDto,
	UpdateUserDto
} from '../types/types';
import { GlobalApi } from './global-api';

@Service()
export class TodoStore {
	private readonly api = inject(GlobalApi);
	private readonly snackBar = inject(MatSnackBar);
	private readonly configuration = inject(AppConfiguration);

	readonly user = toSignal(this.api.loggedInUser, { initialValue: null });
	readonly todos = signal<TodoDto[]>([]);
	readonly loading = signal(false);

	readonly isAuthenticated = computed(() => this.user() !== null);
	readonly isAdmin = computed(() => this.user()?.authorities.includes('ADMIN') ?? false);
	readonly columns = computed<readonly (TodoColumn & { todos: TodoDto[] })[]>(() =>
		TODO_COLUMNS.map((column) => ({
			...column,
			todos: this.todos().filter((todo) => todo.status === column.status)
		}))
	);

	private reloadId = 0;
	private stateVersion = 0;
	private readonly statusMutations = new Map<number, number>();

	constructor() {
		effect(() => {
			if (this.user()) {
				void this.reload();
			} else {
				this.stateVersion += 1;
				this.todos.set([]);
			}
		});
	}

	async reload(): Promise<void> {
		const reloadId = ++this.reloadId;
		const version = this.stateVersion;
		if (!this.user()) {
			this.todos.set([]);
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		try {
			const todos = await firstValueFrom(this.api.getTodos());
			if (reloadId === this.reloadId && version === this.stateVersion) {
				this.todos.set(todos);
			}
		} catch (error: unknown) {
			if (reloadId === this.reloadId && version === this.stateVersion) {
				this.todos.set([]);
				this.handleError('Unable to load todos', error);
			}
		} finally {
			if (reloadId === this.reloadId) {
				this.loading.set(false);
			}
		}
	}

	async getTodo(todoId: number): Promise<TodoDto | null> {
		try {
			return await firstValueFrom(this.api.getTodo(todoId));
		} catch (error: unknown) {
			this.handleError('Unable to load the todo', error);
			return null;
		}
	}

	async signIn(dto: SignInDto): Promise<void> {
		await firstValueFrom(this.api.signIn(dto));
	}

	async signUp(dto: SignUpDto): Promise<void> {
		await firstValueFrom(this.api.signUp(dto));
		await firstValueFrom(this.api.signIn({ username: dto.username, password: dto.password }));
	}

	async signOut(): Promise<void> {
		await firstValueFrom(this.api.signOut());
		this.stateVersion += 1;
		this.todos.set([]);
	}

	async updateProfile(dto: UpdateUserDto): Promise<boolean> {
		return this.mutate('Unable to update the profile', async () => {
			await firstValueFrom(this.api.updateUser(dto));
			this.api.refreshLoggedInUser();
		});
	}

	async changePassword(dto: PatchUserDto): Promise<boolean> {
		return this.mutate('Unable to change the password', async () => {
			await firstValueFrom(this.api.patchUser(dto));
		});
	}

	async deleteAccount(): Promise<boolean> {
		return this.mutate('Unable to delete the account', async () => {
			await firstValueFrom(this.api.deleteUser());
			this.stateVersion += 1;
			this.todos.set([]);
			this.api.clearLoggedInUser();
		});
	}

	async create(dto: CreateTodoDto): Promise<TodoDto | null> {
		try {
			const created = await firstValueFrom(this.api.createTodo(dto));
			this.stateVersion += 1;
			this.todos.update((todos) => [...todos, created]);
			return created;
		} catch (error: unknown) {
			this.handleError('Unable to create the todo', error);
			return null;
		}
	}

	async update(todo: TodoDto, dto: UpdateTodoDto): Promise<boolean> {
		return this.mutate('Unable to update the todo', async () => {
			await firstValueFrom(this.api.updateTodo(dto, todo.id));
			this.patchLocal(todo.id, dto);
		});
	}

	async changeStatus(todo: TodoDto, status: TodoStatus): Promise<void> {
		const current = this.todos().find((item) => item.id === todo.id);
		if (!current || current.status === status) return;

		const previousStatus = current.status;
		const mutationId = (this.statusMutations.get(todo.id) ?? 0) + 1;
		this.statusMutations.set(todo.id, mutationId);
		this.patchLocal(todo.id, { status });

		try {
			await firstValueFrom(this.api.patchTodo({ status }, todo.id));
		} catch (error: unknown) {
			if (this.statusMutations.get(todo.id) === mutationId) {
				this.patchLocal(todo.id, { status: previousStatus });
				this.handleError('Unable to move the todo', error);
			}
		} finally {
			if (this.statusMutations.get(todo.id) === mutationId) {
				this.statusMutations.delete(todo.id);
			}
		}
	}

	async remove(todo: TodoDto): Promise<boolean> {
		return this.mutate('Unable to delete the todo', async () => {
			await firstValueFrom(this.api.deleteTodo(todo.id));
			this.stateVersion += 1;
			this.todos.update((todos) => todos.filter((item) => item.id !== todo.id));
		});
	}

	async removeCompleted(): Promise<void> {
		const completed = this.todos().filter((todo) => todo.status === 'COMPLETED');
		for (const todo of completed) {
			const current = this.todos().find((item) => item.id === todo.id);
			if (current?.status === 'COMPLETED') {
				await this.remove(current);
			}
		}
	}

	async removeAll(): Promise<boolean> {
		return this.mutate('Unable to delete all todos', async () => {
			await firstValueFrom(this.api.deleteTodos());
			this.stateVersion += 1;
			this.todos.set([]);
		});
	}

	private async mutate(message: string, action: () => Promise<unknown>): Promise<boolean> {
		try {
			await action();
			return true;
		} catch (error: unknown) {
			this.handleError(message, error);
			return false;
		}
	}

	private patchLocal(todoId: number, patch: Partial<TodoDto>): void {
		this.stateVersion += 1;
		this.todos.update((todos) =>
			todos.map((todo) => (todo.id === todoId ? { ...todo, ...patch } : todo))
		);
	}

	private handleError(message: string, error: unknown): void {
		const detail = error instanceof Error ? error.message : String(error);
		this.snackBar.open(`${message}: ${detail}`, 'Close', {
			duration: this.configuration.snackBarDuration
		});
	}
}
