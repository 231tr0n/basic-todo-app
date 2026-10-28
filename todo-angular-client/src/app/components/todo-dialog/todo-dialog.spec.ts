import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { TodoDto } from '../../types/types';
import { TodoDialog, TodoDialogData, TodoDialogResult } from './todo-dialog';

interface TodoDialogInternals {
	title: string;
	description: string;
	status: TodoDialogResult['status'];
	valid: boolean;
	save(): void;
	cancel(): void;
}

describe('TodoDialog', () => {
	let data: TodoDialogData;
	let dialogRef: { close: ReturnType<typeof vi.fn> };
	let dialog: TodoDialogInternals;

	const todo: TodoDto = {
		id: 1,
		title: 'Existing',
		description: 'Existing description',
		status: 'IN_PROGRESS'
	};

	beforeEach(() => {
		data = {};
		dialogRef = { close: vi.fn() };
	});

	async function create(): Promise<TodoDialog> {
		await TestBed.configureTestingModule({
			imports: [TodoDialog],
			providers: [
				{ provide: MAT_DIALOG_DATA, useValue: data },
				{ provide: MatDialogRef, useValue: dialogRef }
			]
		}).compileComponents();

		const fixture = TestBed.createComponent(TodoDialog);
		dialog = fixture.componentInstance as unknown as TodoDialogInternals;
		fixture.detectChanges();
		return fixture.componentInstance;
	}

	it('starts a new todo in the requested column', async () => {
		data = { status: 'COMPLETED' };
		await create();

		expect(dialog.title).toBe('');
		expect(dialog.description).toBe('');
		expect(dialog.status).toBe('COMPLETED');
		expect(dialog.valid).toBe(false);
	});

	it('prefills the fields when editing', async () => {
		data = { todo };
		await create();

		expect(dialog.title).toBe(todo.title);
		expect(dialog.description).toBe(todo.description);
		expect(dialog.status).toBe(todo.status);
		expect(dialog.valid).toBe(true);
	});

	it('validates title and description bounds', async () => {
		await create();

		dialog.title = '   ';
		dialog.description = 'Description';
		expect(dialog.valid).toBe(false);

		dialog.title = 'x'.repeat(256);
		expect(dialog.valid).toBe(false);

		dialog.title = 'Valid';
		dialog.description = 'y'.repeat(256);
		expect(dialog.valid).toBe(false);

		dialog.description = 'Description';
		expect(dialog.valid).toBe(true);
	});

	it('saves trimmed values', async () => {
		await create();
		dialog.title = '  New todo  ';
		dialog.description = '  Details  ';
		dialog.status = 'IN_PROGRESS';

		dialog.save();

		expect(dialogRef.close).toHaveBeenCalledWith({
			title: 'New todo',
			description: 'Details',
			status: 'IN_PROGRESS'
		});
	});

	it('does not save an invalid todo', async () => {
		await create();

		dialog.save();

		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it('cancels without a result', async () => {
		await create();

		dialog.cancel();

		expect(dialogRef.close).toHaveBeenCalledWith();
	});
});
