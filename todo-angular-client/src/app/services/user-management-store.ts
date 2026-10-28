import { inject, Service, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AppConfiguration } from '../config/app-configuration';
import { UserDto } from '../types/types';
import { GlobalApi } from './global-api';

@Service()
export class UserManagementStore {
	private readonly api = inject(GlobalApi);
	private readonly snackBar = inject(MatSnackBar);
	private readonly configuration = inject(AppConfiguration);

	readonly users = signal<UserDto[]>([]);
	readonly loading = signal(false);

	private loadId = 0;

	async load(): Promise<void> {
		const loadId = ++this.loadId;
		this.loading.set(true);
		try {
			const users = await firstValueFrom(this.api.getUsers());
			if (loadId === this.loadId) {
				this.users.set(users);
			}
		} catch (error: unknown) {
			if (loadId === this.loadId) {
				this.handleError('Unable to load users', error);
			}
		} finally {
			if (loadId === this.loadId) {
				this.loading.set(false);
			}
		}
	}

	async setAdmin(user: UserDto, admin: boolean): Promise<boolean> {
		return this.mutate('Unable to update the user', async () => {
			const authorities = admin ? ['ADMIN'] : [];
			await firstValueFrom(this.api.updateUser({ authorities }, user.id));
			this.users.update((users) =>
				users.map((candidate) =>
					candidate.id === user.id ? { ...candidate, authorities } : candidate
				)
			);
			this.refreshLoggedInUser(user);
		});
	}

	async remove(user: UserDto): Promise<boolean> {
		return this.mutate('Unable to delete the user', async () => {
			await firstValueFrom(this.api.deleteUser(user.id));
			this.users.update((users) => users.filter((candidate) => candidate.id !== user.id));
			this.refreshLoggedInUser(user);
		});
	}

	private refreshLoggedInUser(user: UserDto): void {
		if (this.api.loggedInUser.value?.id === user.id) {
			this.api.refreshLoggedInUser();
		}
	}

	private async mutate(message: string, action: () => Promise<unknown>): Promise<boolean> {
		try {
			await action();
			return true;
		} catch (error: unknown) {
			this.handleError(message, error);
			return false;
		}
	}

	private handleError(message: string, error: unknown): void {
		const detail = error instanceof Error ? error.message : String(error);
		this.snackBar.open(`${message}: ${detail}`, 'Close', {
			duration: this.configuration.snackBarDuration
		});
	}
}
