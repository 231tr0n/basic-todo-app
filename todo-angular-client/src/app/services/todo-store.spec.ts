import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TodoDto, UserDto } from '../types/types';
import { GlobalApi } from './global-api';
import { TodoStore } from './todo-store';

interface ApiMock {
	loggedInUser: BehaviorSubject<UserDto | null>;
	getTodos: ReturnType<typeof vi.fn>;
	getTodo: ReturnType<typeof vi.fn>;
	signIn: ReturnType<typeof vi.fn>;
	signUp: ReturnType<typeof vi.fn>;
	signOut: ReturnType<typeof vi.fn>;
	updateUser: ReturnType<typeof vi.fn>;
	patchUser: ReturnType<typeof vi.fn>;
	deleteUser: ReturnType<typeof vi.fn>;
	createTodo: ReturnType<typeof vi.fn>;
	updateTodo: ReturnType<typeof vi.fn>;
	patchTodo: ReturnType<typeof vi.fn>;
	deleteTodo: ReturnType<typeof vi.fn>;
	deleteTodos: ReturnType<typeof vi.fn>;
	refreshLoggedInUser: ReturnType<typeof vi.fn>;
	clearLoggedInUser: ReturnType<typeof vi.fn>;
}

describe('TodoStore', () => {
	const user: UserDto = { id: 1, username: 'alice', authorities: [] };
	const todo: TodoDto = {
		id: 1,
		title: 'Todo',
		description: 'Description',
		status: 'NOT_STARTED'
	};
	let api: ApiMock;
	let snackBar: { open: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = {
			loggedInUser: new BehaviorSubject<UserDto | null>(null),
			getTodos: vi.fn(() => of([])),
			getTodo: vi.fn(() => of(todo)),
			signIn: vi.fn(() => of(null)),
			signUp: vi.fn(() => of(null)),
			signOut: vi.fn(() => of(null)),
			updateUser: vi.fn(() => of(null)),
			patchUser: vi.fn(() => of(null)),
			deleteUser: vi.fn(() => of(null)),
			createTodo: vi.fn(() => of(todo)),
			updateTodo: vi.fn(() => of(null)),
			patchTodo: vi.fn(() => of(null)),
			deleteTodo: vi.fn(() => of(null)),
			deleteTodos: vi.fn(() => of(null)),
			refreshLoggedInUser: vi.fn(),
			clearLoggedInUser: vi.fn()
		};
		snackBar = { open: vi.fn() };
		TestBed.configureTestingModule({
			providers: [
				{ provide: GlobalApi, useValue: api },
				{ provide: MatSnackBar, useValue: snackBar }
			]
		});
	});

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it('loads todos and exposes the current user role', async () => {
		api.getTodos.mockReturnValue(of([todo]));
		const store = TestBed.inject(TodoStore);

		expect(store.isAuthenticated()).toBe(false);
		api.loggedInUser.next(user);

		await store.reload();
		expect(store.todos()).toEqual([todo]);
		expect(store.loading()).toBe(false);
		expect(store.isAuthenticated()).toBe(true);
		expect(store.isAdmin()).toBe(false);

		api.loggedInUser.next({ ...user, authorities: ['ADMIN'] });
		expect(store.isAuthenticated()).toBe(true);
		expect(store.isAdmin()).toBe(true);
	});

	it('clears todos and reports load errors', async () => {
		api.getTodos.mockReturnValue(throwError(() => new Error('offline')));
		api.loggedInUser.next(user);
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await store.reload();

		expect(store.todos()).toEqual([]);
		expect(store.loading()).toBe(false);
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to load todos: offline',
			'Close',
			expect.objectContaining({ duration: 5000 })
		);
	});

	it('ignores stale reload responses', async () => {
		const firstResponse = new Subject<TodoDto[]>();
		const secondResponse = new Subject<TodoDto[]>();
		api.getTodos.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);
		api.loggedInUser.next(user);
		const store = TestBed.inject(TodoStore);

		const firstReload = store.reload();
		const secondReload = store.reload();
		const stale: TodoDto = { ...todo, id: 2, title: 'Stale' };
		const fresh: TodoDto = { ...todo, id: 3, title: 'Fresh' };

		secondResponse.next([fresh]);
		secondResponse.complete();
		await secondReload;
		firstResponse.next([stale]);
		firstResponse.complete();
		await firstReload;

		expect(store.todos()).toEqual([fresh]);
	});

	it('loads a single todo and handles failures', async () => {
		const store = TestBed.inject(TodoStore);

		await expect(store.getTodo(todo.id)).resolves.toEqual(todo);
		expect(api.getTodo).toHaveBeenCalledWith(todo.id);

		api.getTodo.mockReturnValueOnce(throwError(() => new Error('missing')));
		await expect(store.getTodo(99)).resolves.toBeNull();
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to load the todo: missing',
			'Close',
			expect.any(Object)
		);
	});

	it('signs in, signs up and signs out', async () => {
		const store = TestBed.inject(TodoStore);

		await store.signIn({ username: 'alice', password: 'secret' });
		expect(api.signIn).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });

		await store.signUp({ username: 'alice', password: 'secret', authorities: [] });
		expect(api.signUp).toHaveBeenCalledWith({
			username: 'alice',
			password: 'secret',
			authorities: []
		});
		expect(api.signIn).toHaveBeenLastCalledWith({ username: 'alice', password: 'secret' });

		store.todos.set([todo]);
		await store.signOut();
		expect(api.signOut).toHaveBeenCalled();
		expect(store.todos()).toEqual([]);
	});

	it('updates and deletes the current account', async () => {
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await expect(store.updateProfile({ username: 'alice-renamed' })).resolves.toBe(true);
		expect(api.updateUser).toHaveBeenCalledWith({ username: 'alice-renamed' });
		expect(api.refreshLoggedInUser).toHaveBeenCalled();

		await expect(store.changePassword({ oldPassword: 'old', newPassword: 'new' })).resolves.toBe(
			true
		);
		expect(api.patchUser).toHaveBeenCalledWith({ oldPassword: 'old', newPassword: 'new' });

		await expect(store.deleteAccount()).resolves.toBe(true);
		expect(api.deleteUser).toHaveBeenCalled();
		expect(api.clearLoggedInUser).toHaveBeenCalled();
		expect(store.todos()).toEqual([]);
	});

	it('creates todos and reports failures', async () => {
		const store = TestBed.inject(TodoStore);

		await expect(store.create({ title: 'Todo', description: 'Description' })).resolves.toEqual(
			todo
		);
		expect(store.todos()).toEqual([todo]);

		api.createTodo.mockReturnValueOnce(throwError(() => new Error('offline')));
		await expect(store.create({ title: 'Other', description: 'Other' })).resolves.toBeNull();
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to create the todo: offline',
			'Close',
			expect.any(Object)
		);
	});

	it('updates todos locally only after the request succeeds', async () => {
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await expect(store.update(todo, { title: 'Updated' })).resolves.toBe(true);
		expect(store.todos()[0].title).toBe('Updated');

		api.updateTodo.mockReturnValueOnce(throwError(() => new Error('offline')));
		await expect(store.update(todo, { title: 'Broken' })).resolves.toBe(false);
		expect(store.todos()[0].title).toBe('Updated');
	});

	it('ignores a status change to the current status', async () => {
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await store.changeStatus(todo, 'NOT_STARTED');
		expect(api.patchTodo).not.toHaveBeenCalled();
	});

	it('ignores a status change for a todo that is no longer in the list', async () => {
		const store = TestBed.inject(TodoStore);

		await store.changeStatus(todo, 'IN_PROGRESS');

		expect(api.patchTodo).not.toHaveBeenCalled();
	});

	it('reverts a failed status change and reports it', async () => {
		api.patchTodo.mockReturnValueOnce(throwError(() => new Error('offline')));
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await store.changeStatus(todo, 'IN_PROGRESS');

		expect(store.todos()[0].status).toBe('NOT_STARTED');
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to move the todo: offline',
			'Close',
			expect.any(Object)
		);
	});

	it('does not let an older failed status change revert a newer one', async () => {
		const store = TestBed.inject(TodoStore);
		const firstPatch = new Subject<void>();
		const secondPatch = new Subject<void>();
		api.patchTodo.mockReturnValueOnce(firstPatch).mockReturnValueOnce(secondPatch);
		store.todos.set([todo]);

		const firstChange = store.changeStatus(todo, 'IN_PROGRESS');
		const secondChange = store.changeStatus(todo, 'COMPLETED');
		secondPatch.next();
		secondPatch.complete();
		await secondChange;
		firstPatch.error(new Error('Network error'));
		await firstChange;

		expect(store.todos()[0].status).toBe('COMPLETED');
	});

	it('removes one todo, completed todos and every todo', async () => {
		const store = TestBed.inject(TodoStore);
		const completed: TodoDto = { ...todo, id: 2, status: 'COMPLETED' };
		store.todos.set([todo, completed]);

		await expect(store.remove(todo)).resolves.toBe(true);
		expect(store.todos()).toEqual([completed]);

		await store.removeCompleted();
		expect(store.todos()).toEqual([]);

		store.todos.set([todo, completed]);
		await expect(store.removeAll()).resolves.toBe(true);
		expect(api.deleteTodos).toHaveBeenCalled();
		expect(store.todos()).toEqual([]);
	});

	it('reports removal failures', async () => {
		api.deleteTodo.mockReturnValueOnce(throwError(() => new Error('offline')));
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await expect(store.remove(todo)).resolves.toBe(false);
		expect(store.todos()).toEqual([todo]);
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to delete the todo: offline',
			'Close',
			expect.any(Object)
		);
	});

	it('reports a failed delete-all request', async () => {
		api.deleteTodos.mockReturnValueOnce(throwError(() => new Error('offline')));
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await expect(store.removeAll()).resolves.toBe(false);

		expect(store.todos()).toEqual([todo]);
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to delete all todos: offline',
			'Close',
			expect.any(Object)
		);
	});

	it('clears the board without a request when signed out', async () => {
		const store = TestBed.inject(TodoStore);
		store.todos.set([todo]);

		await store.reload();

		expect(api.getTodos).not.toHaveBeenCalled();
		expect(store.todos()).toEqual([]);
		expect(store.loading()).toBe(false);
	});

	it('reacts to sign-in and sign-out and groups todos into columns', async () => {
		api.getTodos.mockReturnValue(of([todo]));
		const store = TestBed.inject(TodoStore);

		api.loggedInUser.next(user);
		TestBed.tick();
		await vi.waitFor(() => {
			expect(api.getTodos).toHaveBeenCalled();
		});

		expect(store.todos()).toEqual([todo]);
		expect(store.columns()[0]?.todos).toEqual([todo]);
		expect(store.columns()[1]?.todos).toEqual([]);

		api.loggedInUser.next(null);
		TestBed.tick();

		expect(store.todos()).toEqual([]);
	});
});
