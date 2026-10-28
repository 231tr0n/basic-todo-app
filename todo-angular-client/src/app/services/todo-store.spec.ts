import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';
import { GlobalApi } from './global-api';
import { TodoStore } from './todo-store';
import { TodoDto, UserDto } from '../types/types';

describe('TodoStore', () => {
	const user: UserDto = { id: 1, username: 'alice', authorities: [] };
	let api: {
		loggedInUser: BehaviorSubject<UserDto | null>;
		getTodos: ReturnType<typeof vi.fn>;
		patchTodo: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		api = {
			loggedInUser: new BehaviorSubject<UserDto | null>(user),
			getTodos: vi.fn(() => new Subject<TodoDto[]>()),
			patchTodo: vi.fn()
		};
		TestBed.configureTestingModule({
			providers: [
				{ provide: GlobalApi, useValue: api },
				{ provide: MatSnackBar, useValue: { open: vi.fn() } }
			]
		});
	});

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it('ignores a stale reload response', async () => {
		const store = TestBed.inject(TodoStore);
		const firstReload = store.reload();
		const secondReload = store.reload();
		const subjects = api.getTodos.mock.results
			.slice(-2)
			.map((result) => result.value as Subject<TodoDto[]>);
		const stale: TodoDto = { id: 1, title: 'Stale', description: 'Old', status: 'NOT_STARTED' };
		const fresh: TodoDto = { id: 2, title: 'Fresh', description: 'New', status: 'IN_PROGRESS' };

		subjects[1].next([fresh]);
		subjects[1].complete();
		await secondReload;
		subjects[0].next([stale]);
		subjects[0].complete();
		await firstReload;

		expect(store.todos()).toEqual([fresh]);
	});

	it('does not let an older failed status change revert a newer one', async () => {
		const store = TestBed.inject(TodoStore);
		const firstPatch = new Subject<void>();
		const secondPatch = new Subject<void>();
		api.patchTodo.mockReturnValueOnce(firstPatch).mockReturnValueOnce(secondPatch);
		const todo: TodoDto = {
			id: 1,
			title: 'Todo',
			description: 'Description',
			status: 'NOT_STARTED'
		};
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
});
