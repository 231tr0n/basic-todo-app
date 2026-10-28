import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { TodoStore } from '../../services/todo-store';
import { AuthDialog, AuthDialogData } from './auth-dialog';

interface AuthDialogInternals {
	selectedIndex: number;
	username: string;
	password: string;
	confirmPassword: string;
	admin: boolean;
	busy: boolean;
	error: string | null;
	valid: boolean;
	signIn(): Promise<void>;
	signUp(): Promise<void>;
	cancel(): void;
}

describe('AuthDialog', () => {
	let data: AuthDialogData;
	let dialogRef: { close: ReturnType<typeof vi.fn> };
	let store: {
		signIn: ReturnType<typeof vi.fn>;
		signUp: ReturnType<typeof vi.fn>;
	};
	let dialog: AuthDialogInternals;

	beforeEach(() => {
		data = {};
		dialogRef = { close: vi.fn() };
		store = {
			signIn: vi.fn().mockResolvedValue(undefined),
			signUp: vi.fn().mockResolvedValue(undefined)
		};
	});

	async function create(): Promise<void> {
		await TestBed.configureTestingModule({
			imports: [AuthDialog],
			providers: [
				{ provide: MAT_DIALOG_DATA, useValue: data },
				{ provide: MatDialogRef, useValue: dialogRef },
				{ provide: TodoStore, useValue: store }
			]
		}).compileComponents();

		const fixture = TestBed.createComponent(AuthDialog);
		dialog = fixture.componentInstance as unknown as AuthDialogInternals;
		fixture.detectChanges();
	}

	it('starts on the sign in tab by default', async () => {
		await create();

		expect(dialog.selectedIndex).toBe(0);
		expect(dialog.valid).toBe(false);
	});

	it('starts on the sign up tab when requested', async () => {
		data = { mode: 'sign-up' };
		await create();

		expect(dialog.selectedIndex).toBe(1);
	});

	it('validates credentials for each mode', async () => {
		await create();

		dialog.username = '  ';
		dialog.password = 'secret';
		expect(dialog.valid).toBe(false);

		dialog.username = 'alice';
		expect(dialog.valid).toBe(true);

		dialog.selectedIndex = 1;
		dialog.confirmPassword = 'different';
		expect(dialog.valid).toBe(false);

		dialog.confirmPassword = 'secret';
		expect(dialog.valid).toBe(true);
	});

	it('signs in with trimmed credentials', async () => {
		await create();
		dialog.username = '  alice  ';
		dialog.password = 'secret';

		await dialog.signIn();

		expect(store.signIn).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
		expect(dialogRef.close).toHaveBeenCalledWith(true);
		expect(dialog.error).toBeNull();
		expect(dialog.busy).toBe(false);
	});

	it('shows error messages when signing in fails', async () => {
		await create();
		dialog.username = 'alice';
		dialog.password = 'secret';
		store.signIn.mockRejectedValue(new Error('Invalid credentials'));

		await dialog.signIn();

		expect(dialog.error).toBe('Invalid credentials');
		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it('describes non-error failures', async () => {
		await create();
		dialog.username = 'alice';
		dialog.password = 'secret';
		store.signIn.mockRejectedValue('string failure');

		await dialog.signIn();

		expect(dialog.error).toBe('string failure');
	});

	it('ignores invalid or concurrent sign ins', async () => {
		await create();

		await dialog.signIn();
		expect(store.signIn).not.toHaveBeenCalled();

		dialog.username = 'alice';
		dialog.password = 'secret';
		dialog.busy = true;
		await dialog.signIn();
		expect(store.signIn).not.toHaveBeenCalled();
	});

	it('creates an account with the selected authorities', async () => {
		data = { mode: 'sign-up' };
		await create();
		dialog.username = '  admin  ';
		dialog.password = 'secret';
		dialog.confirmPassword = 'secret';
		dialog.admin = true;

		await dialog.signUp();

		expect(store.signUp).toHaveBeenCalledWith({
			username: 'admin',
			password: 'secret',
			authorities: ['ADMIN']
		});
		expect(dialogRef.close).toHaveBeenCalledWith(true);
	});

	it('creates a regular account without authorities', async () => {
		data = { mode: 'sign-up' };
		await create();
		dialog.username = 'alice';
		dialog.password = 'secret';
		dialog.confirmPassword = 'secret';

		await dialog.signUp();

		expect(store.signUp).toHaveBeenCalledWith({
			username: 'alice',
			password: 'secret',
			authorities: []
		});
	});

	it('reports mismatched passwords without calling the store', async () => {
		data = { mode: 'sign-up' };
		await create();
		dialog.username = 'alice';
		dialog.password = 'secret';
		dialog.confirmPassword = 'different';

		await dialog.signUp();

		expect(dialog.error).toBe('The passwords do not match.');
		expect(store.signUp).not.toHaveBeenCalled();
	});

	it('shows error messages when signing up fails', async () => {
		data = { mode: 'sign-up' };
		await create();
		dialog.username = 'alice';
		dialog.password = 'secret';
		dialog.confirmPassword = 'secret';
		store.signUp.mockRejectedValue(new Error('Username already exists'));

		await dialog.signUp();

		expect(dialog.error).toBe('Username already exists');
		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it('ignores invalid or concurrent sign ups', async () => {
		data = { mode: 'sign-up' };
		await create();

		await dialog.signUp();
		expect(store.signUp).not.toHaveBeenCalled();

		dialog.username = 'alice';
		dialog.password = 'secret';
		dialog.confirmPassword = 'secret';
		dialog.busy = true;
		await dialog.signUp();
		expect(store.signUp).not.toHaveBeenCalled();
	});

	it('closes with false when cancelled', async () => {
		await create();

		dialog.cancel();

		expect(dialogRef.close).toHaveBeenCalledWith(false);
	});
});
