import { computed, effect, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AppConfiguration } from '../config/app-configuration';
import {
	CreateTodoDto,
	SignInDto,
	SignUpDto,
	TodoColumn,
	TodoDto,
	TodoStatus,
	TODO_COLUMNS,
	UpdateTodoDto
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
	readonly isAdmin = computed(
		() => this.user()?.authorities.some((authority) => authority.authority === 'ADMIN') ?? false
	);
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
		try {
			await firstValueFrom(this.api.updateTodo(dto, todo.id));
			this.patchLocal(todo.id, dto);
			return true;
		} catch (error: unknown) {
			this.handleError('Unable to update the todo', error);
			return false;
		}
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
			if (this.statusMutations.get(todo.id) === mutationId) {
				this.patchLocal(todo.id, { status });
			}
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

	async remove(todo: TodoDto): Promise<void> {
		try {
			await firstValueFrom(this.api.deleteTodo(todo.id));
			this.stateVersion += 1;
			this.todos.update((todos) => todos.filter((item) => item.id !== todo.id));
		} catch (error: unknown) {
			this.handleError('Unable to delete the todo', error);
		}
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
