import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { ConfirmDialogService } from '../../services/confirm-dialog';
import { TodoStore } from '../../services/todo-store';
import { AccountDialog } from './account-dialog';

interface AccountDialogInternals {
	username: string;
	oldPassword: string;
	newPassword: string;
	confirmPassword: string;
	busy: boolean;
	profileValid: boolean;
	passwordValid: boolean;
	saveProfile(): Promise<void>;
	savePassword(): Promise<void>;
	deleteAccount(): Promise<void>;
	cancel(): void;
}

describe('AccountDialog', () => {
	let dialogRef: { close: ReturnType<typeof vi.fn> };
	let confirm: ReturnType<typeof vi.fn>;
	let store: {
		user: ReturnType<typeof signal>;
		isAdmin: ReturnType<typeof signal<boolean>>;
		updateProfile: ReturnType<typeof vi.fn>;
		changePassword: ReturnType<typeof vi.fn>;
		deleteAccount: ReturnType<typeof vi.fn>;
	};
	let dialog: AccountDialogInternals;

	beforeEach(async () => {
		dialogRef = { close: vi.fn() };
		confirm = vi.fn().mockResolvedValue(true);
		store = {
			user: signal({ id: 1, username: 'alice', authorities: [] }),
			isAdmin: signal(false),
			updateProfile: vi.fn().mockResolvedValue(true),
			changePassword: vi.fn().mockResolvedValue(true),
			deleteAccount: vi.fn().mockResolvedValue(true)
		};

		await TestBed.configureTestingModule({
			imports: [AccountDialog],
			providers: [
				{ provide: MatDialogRef, useValue: dialogRef },
				{ provide: ConfirmDialogService, useValue: { confirm } },
				{ provide: TodoStore, useValue: store }
			]
		}).compileComponents();

		const fixture = TestBed.createComponent(AccountDialog);
		dialog = fixture.componentInstance as unknown as AccountDialogInternals;
		fixture.detectChanges();
	});

	it('prefills the username and validates the profile', () => {
		expect(dialog.username).toBe('alice');
		expect(dialog.profileValid).toBe(true);

		dialog.username = '   ';
		expect(dialog.profileValid).toBe(false);

		dialog.username = 'x'.repeat(256);
		expect(dialog.profileValid).toBe(false);
	});

	it('saves a trimmed username and closes when successful', async () => {
		dialog.username = '  Alice  ';

		await dialog.saveProfile();

		expect(store.updateProfile).toHaveBeenCalledWith({ username: 'Alice' });
		expect(dialogRef.close).toHaveBeenCalledWith(true);
		expect(dialog.busy).toBe(false);
	});

	it('keeps the dialog open when the profile update fails', async () => {
		store.updateProfile.mockResolvedValue(false);

		await dialog.saveProfile();

		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it('ignores invalid or concurrent profile saves', async () => {
		dialog.username = ' ';

		await dialog.saveProfile();
		dialog.busy = true;
		dialog.username = 'Alice';
		await dialog.saveProfile();

		expect(store.updateProfile).not.toHaveBeenCalled();
	});

	it('validates the password fields', () => {
		expect(dialog.passwordValid).toBe(false);

		dialog.oldPassword = 'old';
		dialog.newPassword = 'new';
		expect(dialog.passwordValid).toBe(false);

		dialog.confirmPassword = 'different';
		expect(dialog.passwordValid).toBe(false);

		dialog.confirmPassword = 'new';
		expect(dialog.passwordValid).toBe(true);

		dialog.newPassword = 'old';
		dialog.confirmPassword = 'old';
		expect(dialog.passwordValid).toBe(false);
	});

	it('changes the password and closes when successful', async () => {
		dialog.oldPassword = 'old';
		dialog.newPassword = 'new';
		dialog.confirmPassword = 'new';

		await dialog.savePassword();

		expect(store.changePassword).toHaveBeenCalledWith({
			oldPassword: 'old',
			newPassword: 'new'
		});
		expect(dialogRef.close).toHaveBeenCalledWith(true);
	});

	it('keeps the dialog open when the password change fails', async () => {
		store.changePassword.mockResolvedValue(false);
		dialog.oldPassword = 'old';
		dialog.newPassword = 'new';
		dialog.confirmPassword = 'new';

		await dialog.savePassword();

		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it('ignores invalid or concurrent password saves', async () => {
		dialog.oldPassword = 'old';
		dialog.newPassword = 'new';

		await dialog.savePassword();
		expect(store.changePassword).not.toHaveBeenCalled();

		dialog.confirmPassword = 'new';
		dialog.busy = true;
		await dialog.savePassword();
		expect(store.changePassword).not.toHaveBeenCalled();
	});

	it('deletes the account after confirmation', async () => {
		await dialog.deleteAccount();

		expect(confirm).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Delete account', destructive: true })
		);
		expect(store.deleteAccount).toHaveBeenCalled();
		expect(dialogRef.close).toHaveBeenCalledWith(true);
	});

	it('cancels account deletion', async () => {
		confirm.mockResolvedValue(false);

		await dialog.deleteAccount();

		expect(store.deleteAccount).not.toHaveBeenCalled();
		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it('ignores account deletion while busy or when it fails', async () => {
		dialog.busy = true;
		await dialog.deleteAccount();
		expect(confirm).not.toHaveBeenCalled();

		dialog.busy = false;
		store.deleteAccount.mockResolvedValue(false);
		await dialog.deleteAccount();
		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it('closes with false when cancelled', () => {
		dialog.cancel();

		expect(dialogRef.close).toHaveBeenCalledWith(false);
	});
});
