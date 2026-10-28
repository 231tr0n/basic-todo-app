import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { AccountDialogService } from './services/account-dialog';
import { AuthDialogService } from './services/auth-dialog';
import { TodoStore } from './services/todo-store';
import { UsersDialogService } from './services/users-dialog';
import { UserDto } from './types/types';

interface AppInternals {
	darkMode: boolean;
	toggleTheme(): void;
	openAuth(mode: 'sign-in' | 'sign-up'): Promise<void>;
	openAccount(): Promise<void>;
	openUsers(): Promise<void>;
	signOut(): Promise<void>;
}

describe('App', () => {
	let fixture: ComponentFixture<App>;
	let app: AppInternals;
	let store: {
		user: ReturnType<typeof signal<UserDto | null>>;
		isAdmin: ReturnType<typeof signal<boolean>>;
		signOut: ReturnType<typeof vi.fn>;
	};
	let authDialog: { open: ReturnType<typeof vi.fn> };
	let accountDialog: { open: ReturnType<typeof vi.fn> };
	let usersDialog: { open: ReturnType<typeof vi.fn> };

	beforeEach(async () => {
		document.body.classList.remove('dark');
		store = {
			user: signal<UserDto | null>(null),
			isAdmin: signal(false),
			signOut: vi.fn().mockResolvedValue(undefined)
		};
		authDialog = { open: vi.fn().mockResolvedValue(true) };
		accountDialog = { open: vi.fn().mockResolvedValue(true) };
		usersDialog = { open: vi.fn().mockResolvedValue(undefined) };

		await TestBed.configureTestingModule({
			imports: [App],
			providers: [
				provideRouter([]),
				{ provide: TodoStore, useValue: store },
				{ provide: AuthDialogService, useValue: authDialog },
				{ provide: AccountDialogService, useValue: accountDialog },
				{ provide: UsersDialogService, useValue: usersDialog }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(App);
		app = fixture.componentInstance as unknown as AppInternals;
		fixture.detectChanges();
	});

	it('shows the signed-out actions', () => {
		const element = fixture.nativeElement as HTMLElement;

		expect(element.textContent).toContain('Sign in');
		expect(element.textContent).toContain('Create account');
	});

	it('shows the signed-in user and admin actions', () => {
		store.user.set({ id: 1, username: 'alice', authorities: [] });
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;

		expect(element.textContent).toContain('alice');

		store.isAdmin.set(true);
		fixture.detectChanges();
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('opens every account dialog', async () => {
		await app.openAuth('sign-up');
		expect(authDialog.open).toHaveBeenCalledWith('sign-up');

		await app.openAccount();
		expect(accountDialog.open).toHaveBeenCalled();

		await app.openUsers();
		expect(usersDialog.open).toHaveBeenCalled();
	});

	it('signs out', async () => {
		await app.signOut();

		expect(store.signOut).toHaveBeenCalled();
	});

	it('toggles the dark theme', () => {
		expect(app.darkMode).toBe(false);

		app.toggleTheme();
		expect(app.darkMode).toBe(true);
		expect(document.body.classList.contains('dark')).toBe(true);

		app.toggleTheme();
		expect(app.darkMode).toBe(false);
		expect(document.body.classList.contains('dark')).toBe(false);
	});
});
