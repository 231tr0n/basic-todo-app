import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
	MatDialogActions,
	MatDialogContent,
	MatDialogRef,
	MatDialogTitle
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { ConfirmDialogService } from '../../services/confirm-dialog';
import { TodoStore } from '../../services/todo-store';

@Component({
	selector: 'app-account-dialog',
	imports: [
		FormsModule,
		MatButton,
		MatDialogActions,
		MatDialogContent,
		MatDialogTitle,
		MatFormFieldModule,
		MatInputModule,
		MatTab,
		MatTabGroup
	],
	templateUrl: './account-dialog.html',
	styleUrl: './account-dialog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountDialog {
	private readonly dialogRef = inject(MatDialogRef<AccountDialog, boolean>);
	private readonly confirmDialog = inject(ConfirmDialogService);
	protected readonly store = inject(TodoStore);

	protected username = this.store.user()?.username ?? '';
	protected oldPassword = '';
	protected newPassword = '';
	protected confirmPassword = '';
	protected busy = false;

	protected get profileValid(): boolean {
		const username = this.username.trim();
		return username.length > 0 && username.length <= 255;
	}

	protected get passwordValid(): boolean {
		return (
			this.oldPassword.length > 0 &&
			this.newPassword.length > 0 &&
			this.newPassword === this.confirmPassword &&
			this.oldPassword !== this.newPassword
		);
	}

	protected async saveProfile(): Promise<void> {
		if (!this.profileValid || this.busy) return;
		this.busy = true;
		try {
			const updated = await this.store.updateProfile({ username: this.username.trim() });
			if (!updated) return;
			this.dialogRef.close(true);
		} finally {
			this.busy = false;
		}
	}

	protected async savePassword(): Promise<void> {
		if (!this.passwordValid || this.busy) return;
		this.busy = true;
		try {
			const updated = await this.store.changePassword({
				oldPassword: this.oldPassword,
				newPassword: this.newPassword
			});
			if (!updated) return;
			this.dialogRef.close(true);
		} finally {
			this.busy = false;
		}
	}

	protected async deleteAccount(): Promise<void> {
		if (this.busy) return;
		const confirmed = await this.confirmDialog.confirm({
			title: 'Delete account',
			message: 'This permanently deletes your account and every todo that belongs to it.',
			confirmLabel: 'Delete account',
			destructive: true
		});
		if (!confirmed) return;
		this.busy = true;
		try {
			const deleted = await this.store.deleteAccount();
			if (deleted) {
				this.dialogRef.close(true);
			}
		} finally {
			this.busy = false;
		}
	}

	protected cancel(): void {
		this.dialogRef.close(false);
	}
}
