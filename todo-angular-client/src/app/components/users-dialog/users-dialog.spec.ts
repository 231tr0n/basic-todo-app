import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { ConfirmDialogService } from '../../services/confirm-dialog';
import { TodoStore } from '../../services/todo-store';
import { UserManagementStore } from '../../services/user-management-store';
import { UserDto } from '../../types/types';
import { UsersDialog } from './users-dialog';

interface UsersDialogInternals {
	ngOnInit(): void;
	isAdmin(user: UserDto): boolean;
	isCurrentUser(user: UserDto): boolean;
	toggleAdmin(user: UserDto): Promise<void>;
	remove(user: UserDto): Promise<void>;
	close(): void;
	displayedColumns: string[];
}

describe('UsersDialog', () => {
	let fixture: ComponentFixture<UsersDialog>;
	let dialog: UsersDialogInternals;
	let dialogRef: { close: ReturnType<typeof vi.fn> };
	let confirm: ReturnType<typeof vi.fn>;
	let userStore: {
		user: ReturnType<typeof signal>;
	};
	let store: {
		users: ReturnType<typeof signal<UserDto[]>>;
		loading: ReturnType<typeof signal<boolean>>;
		load: ReturnType<typeof vi.fn>;
		setAdmin: ReturnType<typeof vi.fn>;
		remove: ReturnType<typeof vi.fn>;
	};
	let element: HTMLElement;

	const alice: UserDto = { id: 1, username: 'alice', authorities: [] };
	const admin: UserDto = { id: 2, username: 'admin', authorities: ['ADMIN'] };

	beforeEach(async () => {
		dialogRef = { close: vi.fn() };
		confirm = vi.fn().mockResolvedValue(true);
		userStore = { user: signal(alice) };
		store = {
			users: signal<UserDto[]>([alice, admin]),
			loading: signal(false),
			load: vi.fn().mockResolvedValue(undefined),
			setAdmin: vi.fn().mockResolvedValue(true),
			remove: vi.fn().mockResolvedValue(true)
		};

		await TestBed.configureTestingModule({
			imports: [UsersDialog],
			providers: [
				{ provide: MatDialogRef, useValue: dialogRef },
				{ provide: ConfirmDialogService, useValue: { confirm } },
				{ provide: TodoStore, useValue: userStore },
				{ provide: UserManagementStore, useValue: store }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(UsersDialog);
		dialog = fixture.componentInstance as unknown as UsersDialogInternals;
		dialog.ngOnInit();
		fixture.detectChanges();
		element = fixture.nativeElement as HTMLElement;
	});

	it('loads and renders the users', () => {
		expect(store.load).toHaveBeenCalled();
		expect(dialog.displayedColumns).toEqual(['username', 'authorities', 'actions']);
		expect(element.textContent).toContain('alice');
		expect(element.textContent).toContain('admin');
		expect(element.textContent).toContain('You');
		expect(element.textContent).toContain('Administrator');
		expect(element.textContent).toContain('Member');
	});

	it('shows the loading bar while loading', () => {
		store.loading.set(true);
		fixture.detectChanges();

		expect(element.querySelector('mat-progress-bar')).not.toBeNull();
	});

	it('shows an empty state without users', () => {
		store.users.set([]);
		fixture.detectChanges();

		expect(element.textContent).toContain('No users found.');
	});

	it('identifies admins and the current user', () => {
		expect(dialog.isAdmin(admin)).toBe(true);
		expect(dialog.isAdmin(alice)).toBe(false);
		expect(dialog.isCurrentUser(alice)).toBe(true);
		expect(dialog.isCurrentUser(admin)).toBe(false);
	});

	it('grants administrator access after confirmation', async () => {
		await dialog.toggleAdmin(alice);

		expect(confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Grant administrator access',
				destructive: false
			})
		);
		expect(store.setAdmin).toHaveBeenCalledWith(alice, true);
	});

	it('removes administrator access after confirmation', async () => {
		await dialog.toggleAdmin(admin);

		expect(confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Remove administrator access',
				destructive: true
			})
		);
		expect(store.setAdmin).toHaveBeenCalledWith(admin, false);
	});

	it('does not change authorities when not confirmed', async () => {
		confirm.mockResolvedValue(false);

		await dialog.toggleAdmin(alice);

		expect(store.setAdmin).not.toHaveBeenCalled();
	});

	it('removes a user after confirmation', async () => {
		await dialog.remove(admin);

		expect(confirm).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Delete user', destructive: true })
		);
		expect(store.remove).toHaveBeenCalledWith(admin);
	});

	it('does not remove a user when not confirmed', async () => {
		confirm.mockResolvedValue(false);

		await dialog.remove(admin);

		expect(store.remove).not.toHaveBeenCalled();
	});

	it('closes the dialog', () => {
		dialog.close();

		expect(dialogRef.close).toHaveBeenCalled();
	});
});
