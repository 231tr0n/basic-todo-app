import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
	MAT_DIALOG_DATA,
	MatDialogActions,
	MatDialogContent,
	MatDialogRef,
	MatDialogTitle
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { TodoStore } from '../../services/todo-store';

export type AuthMode = 'sign-in' | 'sign-up';

export interface AuthDialogData {
	readonly mode?: AuthMode;
}

@Component({
	selector: 'app-auth-dialog',
	imports: [
		FormsModule,
		MatButton,
		MatCheckbox,
		MatDialogActions,
		MatDialogContent,
		MatDialogTitle,
		MatFormFieldModule,
		MatInputModule,
		MatTab,
		MatTabGroup
	],
	templateUrl: './auth-dialog.html',
	styleUrl: './auth-dialog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthDialog {
	private readonly dialogRef = inject(MatDialogRef<AuthDialog, boolean>);
	private readonly store = inject(TodoStore);

	protected readonly data = inject<AuthDialogData>(MAT_DIALOG_DATA);
	protected selectedIndex = this.data.mode === 'sign-up' ? 1 : 0;

	protected username = '';
	protected password = '';
	protected confirmPassword = '';
	protected admin = false;
	protected busy = false;
	protected error: string | null = null;

	protected get valid(): boolean {
		if (this.username.trim().length === 0 || this.password.length === 0) return false;
		if (this.selectedIndex === 1) {
			return this.password === this.confirmPassword;
		}
		return true;
	}

	protected async signIn(): Promise<void> {
		if (!this.valid || this.busy) return;
		this.busy = true;
		this.error = null;
		try {
			await this.store.signIn({
				username: this.username.trim(),
				password: this.password
			});
			this.dialogRef.close(true);
		} catch (error: unknown) {
			this.error = this.describe(error);
		} finally {
			this.busy = false;
		}
	}

	protected async signUp(): Promise<void> {
		if (this.busy) return;
		if (this.password !== this.confirmPassword) {
			this.error = 'The passwords do not match.';
			return;
		}
		if (!this.valid) return;
		this.busy = true;
		this.error = null;
		try {
			await this.store.signUp({
				username: this.username.trim(),
				password: this.password,
				authorities: this.admin ? ['ADMIN'] : []
			});
			this.dialogRef.close(true);
		} catch (error: unknown) {
			this.error = this.describe(error);
		} finally {
			this.busy = false;
		}
	}

	protected cancel(): void {
		this.dialogRef.close(false);
	}

	private describe(error: unknown): string {
		if (error instanceof Error) return error.message;
		return String(error);
	}
}
