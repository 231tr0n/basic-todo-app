import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { UserDto } from '../types/types';
import { GlobalApi } from './global-api';
import { UserManagementStore } from './user-management-store';

describe('UserManagementStore', () => {
	const admin: UserDto = { id: 1, username: 'admin', authorities: ['ADMIN'] };
	const alice: UserDto = { id: 2, username: 'alice', authorities: [] };
	let api: {
		loggedInUser: BehaviorSubject<UserDto | null>;
		getUsers: ReturnType<typeof vi.fn>;
		updateUser: ReturnType<typeof vi.fn>;
		deleteUser: ReturnType<typeof vi.fn>;
		refreshLoggedInUser: ReturnType<typeof vi.fn>;
	};
	let snackBar: { open: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = {
			loggedInUser: new BehaviorSubject<UserDto | null>(admin),
			getUsers: vi.fn(() => of([admin, alice])),
			updateUser: vi.fn(() => of(null)),
			deleteUser: vi.fn(() => of(null)),
			refreshLoggedInUser: vi.fn()
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

	it('loads users and handles failures', async () => {
		const store = TestBed.inject(UserManagementStore);

		await store.load();
		expect(store.users()).toEqual([admin, alice]);
		expect(store.loading()).toBe(false);

		api.getUsers.mockReturnValueOnce(throwError(() => new Error('offline')));
		await store.load();
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to load users: offline',
			'Close',
			expect.any(Object)
		);
	});

	it('ignores a stale load response', async () => {
		const first = new Subject<UserDto[]>();
		const second = new Subject<UserDto[]>();
		api.getUsers.mockReturnValueOnce(first).mockReturnValueOnce(second);
		const store = TestBed.inject(UserManagementStore);

		const firstLoad = store.load();
		const secondLoad = store.load();
		second.next([alice]);
		second.complete();
		await secondLoad;
		first.next([admin]);
		first.complete();
		await firstLoad;

		expect(store.users()).toEqual([alice]);
	});

	it('grants and removes administrator access', async () => {
		const store = TestBed.inject(UserManagementStore);
		await store.load();

		await expect(store.setAdmin(alice, true)).resolves.toBe(true);
		expect(api.updateUser).toHaveBeenCalledWith({ authorities: ['ADMIN'] }, alice.id);
		expect(store.users().find((user) => user.id === alice.id)?.authorities).toEqual(['ADMIN']);
		expect(api.refreshLoggedInUser).not.toHaveBeenCalled();

		await expect(store.setAdmin(admin, false)).resolves.toBe(true);
		expect(api.updateUser).toHaveBeenLastCalledWith({ authorities: [] }, admin.id);
		expect(api.refreshLoggedInUser).toHaveBeenCalled();
	});

	it('deletes users and refreshes the current account', async () => {
		const store = TestBed.inject(UserManagementStore);
		await store.load();

		await expect(store.remove(alice)).resolves.toBe(true);
		expect(api.deleteUser).toHaveBeenCalledWith(alice.id);
		expect(store.users().map((user) => user.id)).toEqual([admin.id]);

		await expect(store.remove(admin)).resolves.toBe(true);
		expect(api.refreshLoggedInUser).toHaveBeenCalledTimes(1);
	});

	it('reports mutation failures', async () => {
		api.updateUser.mockReturnValueOnce(throwError(() => new Error('forbidden')));
		api.deleteUser.mockReturnValueOnce(throwError(() => new Error('offline')));
		const store = TestBed.inject(UserManagementStore);
		await store.load();

		await expect(store.setAdmin(alice, true)).resolves.toBe(false);
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to update the user: forbidden',
			'Close',
			expect.any(Object)
		);

		await expect(store.remove(alice)).resolves.toBe(false);
		expect(snackBar.open).toHaveBeenCalledWith(
			'Unable to delete the user: offline',
			'Close',
			expect.any(Object)
		);
	});
});
