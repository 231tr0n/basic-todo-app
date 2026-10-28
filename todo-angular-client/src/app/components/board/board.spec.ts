import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { TodoStore } from '../../services/todo-store';
import { AuthDialogService } from '../../services/auth-dialog';
import { ConfirmDialogService } from '../../services/confirm-dialog';
import { TODO_COLUMNS, TodoDto, TodoStatus } from '../../types/types';
import { Board } from './board';

interface BoardInternals {
	todoCount: number;
	completedCount: number;
	onCreate(status?: TodoStatus): Promise<void>;
	onEdit(todo: TodoDto): Promise<void>;
	onDelete(todo: TodoDto): Promise<void>;
	onDrop(event: CdkDragDrop<TodoDto[]>): Promise<void>;
	onSignIn(): Promise<void>;
	onClearCompleted(): Promise<void>;
	onDeleteAll(): Promise<void>;
}

describe('Board', () => {
	let fixture: ComponentFixture<Board>;
	let board: BoardInternals;
	let store: {
		todos: ReturnType<typeof signal<TodoDto[]>>;
		isAuthenticated: ReturnType<typeof signal<boolean>>;
		loading: ReturnType<typeof signal<boolean>>;
		columns: ReturnType<typeof signal<ReturnType<typeof buildColumns>>>;
		create: ReturnType<typeof vi.fn>;
		getTodo: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
		changeStatus: ReturnType<typeof vi.fn>;
		remove: ReturnType<typeof vi.fn>;
		removeCompleted: ReturnType<typeof vi.fn>;
		removeAll: ReturnType<typeof vi.fn>;
	};
	let dialog: { open: ReturnType<typeof vi.fn> };
	let authDialog: { open: ReturnType<typeof vi.fn> };
	let confirmDialog: { confirm: ReturnType<typeof vi.fn> };

	const todo: TodoDto = {
		id: 1,
		title: 'Todo',
		description: 'Description',
		status: 'NOT_STARTED'
	};

	beforeEach(async () => {
		store = {
			todos: signal<TodoDto[]>([]),
			isAuthenticated: signal(false),
			loading: signal(false),
			columns: signal(buildColumns([])),
			create: vi.fn(),
			getTodo: vi.fn(),
			update: vi.fn(),
			changeStatus: vi.fn(),
			remove: vi.fn(),
			removeCompleted: vi.fn(),
			removeAll: vi.fn()
		};
		dialog = { open: vi.fn() };
		authDialog = { open: vi.fn() };
		confirmDialog = { confirm: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [Board],
			providers: [
				{ provide: TodoStore, useValue: store },
				{ provide: MatDialog, useValue: dialog },
				{ provide: AuthDialogService, useValue: authDialog },
				{ provide: ConfirmDialogService, useValue: confirmDialog }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(Board);
		board = fixture.componentInstance as unknown as BoardInternals;
		fixture.detectChanges();
	});

	it('shows the signed-out state and opens sign in', async () => {
		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector('.signed-out')).toBeTruthy();
		expect(element.querySelector('.subtitle')?.textContent).toContain('0 todos');

		await board.onSignIn();
		expect(authDialog.open).toHaveBeenCalledWith('sign-in');
	});

	it('counts todos and completed todos', () => {
		store.todos.set([todo, { ...todo, id: 2, status: 'COMPLETED' }]);

		expect(board.todoCount).toBe(2);
		expect(board.completedCount).toBe(1);
	});

	it('creates a todo and moves it to the requested column', async () => {
		openDialog({ title: 'New', description: 'Details', status: 'IN_PROGRESS' });
		const created: TodoDto = { id: 5, title: 'New', description: 'Details', status: 'NOT_STARTED' };
		store.create.mockResolvedValue(created);

		await board.onCreate('IN_PROGRESS');

		expect(store.create).toHaveBeenCalledWith({ title: 'New', description: 'Details' });
		expect(store.changeStatus).toHaveBeenCalledWith(created, 'IN_PROGRESS');
	});

	it('does not move a created todo that already has the requested status', async () => {
		openDialog({ title: 'New', description: 'Details', status: 'NOT_STARTED' });
		store.create.mockResolvedValue({ ...todo, id: 5 });

		await board.onCreate();

		expect(store.changeStatus).not.toHaveBeenCalled();
	});

	it('ignores a cancelled create dialog', async () => {
		dialog.open.mockReturnValue({ afterClosed: () => of(undefined), close: vi.fn() });

		await board.onCreate();

		expect(store.create).not.toHaveBeenCalled();
	});

	it('edits a todo and updates its status', async () => {
		store.getTodo.mockResolvedValue(todo);
		openDialog({ title: 'Updated', description: 'Updated description', status: 'COMPLETED' });
		store.update.mockResolvedValue(true);

		await board.onEdit(todo);

		expect(dialog.open).toHaveBeenCalled();
		expect(store.update).toHaveBeenCalledWith(todo, {
			title: 'Updated',
			description: 'Updated description'
		});
		expect(store.changeStatus).toHaveBeenCalledWith(todo, 'COMPLETED');
	});

	it('does not update unchanged fields or status', async () => {
		store.getTodo.mockResolvedValue(todo);
		openDialog({ title: todo.title, description: todo.description, status: todo.status });

		await board.onEdit(todo);

		expect(store.update).not.toHaveBeenCalled();
		expect(store.changeStatus).not.toHaveBeenCalled();
	});

	it('stops editing when the todo is missing or the update fails', async () => {
		store.getTodo.mockResolvedValueOnce(null);
		await board.onEdit(todo);
		expect(dialog.open).not.toHaveBeenCalled();

		store.getTodo.mockResolvedValueOnce(todo);
		openDialog({ title: 'Updated', description: 'Description', status: todo.status });
		store.update.mockResolvedValueOnce(false);

		await board.onEdit(todo);
		expect(store.update).toHaveBeenCalled();
		expect(store.changeStatus).not.toHaveBeenCalled();
	});

	it('deletes a todo only when confirmed', async () => {
		confirmDialog.confirm.mockResolvedValueOnce(false);
		await board.onDelete(todo);
		expect(store.remove).not.toHaveBeenCalled();

		confirmDialog.confirm.mockResolvedValueOnce(true);
		await board.onDelete(todo);
		expect(store.remove).toHaveBeenCalledWith(todo);
	});

	it('changes status only for valid drop targets', async () => {
		await board.onDrop(dropEvent(todo, 'IN_PROGRESS'));
		expect(store.changeStatus).toHaveBeenCalledWith(todo, 'IN_PROGRESS');

		await board.onDrop(dropEvent({ invalid: true }, 'IN_PROGRESS'));
		await board.onDrop(dropEvent(todo, 'UNKNOWN'));
		expect(store.changeStatus).toHaveBeenCalledTimes(1);
	});

	it('clears completed todos and deletes all only when confirmed', async () => {
		store.todos.set([todo, { ...todo, id: 2, status: 'COMPLETED' }]);

		confirmDialog.confirm.mockResolvedValueOnce(false);
		await board.onClearCompleted();
		expect(store.removeCompleted).not.toHaveBeenCalled();

		confirmDialog.confirm.mockResolvedValueOnce(true);
		await board.onClearCompleted();
		expect(store.removeCompleted).toHaveBeenCalled();

		confirmDialog.confirm.mockResolvedValueOnce(false);
		await board.onDeleteAll();
		expect(store.removeAll).not.toHaveBeenCalled();

		confirmDialog.confirm.mockResolvedValueOnce(true);
		await board.onDeleteAll();
		expect(store.removeAll).toHaveBeenCalled();
	});

	it('closes open todo dialogs when destroyed', async () => {
		const closed = new Subject<undefined>();
		const close = vi.fn(() => {
			closed.next(undefined);
		});
		dialog.open.mockReturnValue({ afterClosed: () => closed, close });

		const creating = board.onCreate();
		fixture.destroy();

		expect(close).toHaveBeenCalled();
		closed.complete();
		await creating;
	});

	function openDialog(result: { title: string; description: string; status: TodoStatus }): void {
		dialog.open.mockReturnValue({ afterClosed: () => of(result), close: vi.fn() });
	}

	function dropEvent(data: unknown, status: string): CdkDragDrop<TodoDto[]> {
		return {
			item: { data },
			container: { id: status }
		} as unknown as CdkDragDrop<TodoDto[]>;
	}
});

function buildColumns(todos: TodoDto[]) {
	return TODO_COLUMNS.map((column) => ({
		...column,
		todos: todos.filter((todo) => todo.status === column.status)
	}));
}
