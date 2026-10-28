import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
	MatDialogActions,
	MatDialogContent,
	MatDialogRef,
	MatDialogTitle
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { ConfirmDialogService } from '../../services/confirm-dialog';
import { TodoStore } from '../../services/todo-store';
import { UserManagementStore } from '../../services/user-management-store';
import { UserDto } from '../../types/types';

@Component({
	selector: 'app-users-dialog',
	imports: [
		MatButton,
		MatDialogActions,
		MatDialogContent,
		MatDialogTitle,
		MatIcon,
		MatIconButton,
		MatProgressBar,
		MatTableModule,
		MatTooltip
	],
	templateUrl: './users-dialog.html',
	styleUrl: './users-dialog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersDialog implements OnInit {
	private readonly dialogRef = inject(MatDialogRef<UsersDialog, void>);
	private readonly confirmDialog = inject(ConfirmDialogService);
	private readonly todoStore = inject(TodoStore);
	protected readonly store = inject(UserManagementStore);
	protected readonly displayedColumns = ['username', 'authorities', 'actions'];

	ngOnInit(): void {
		void this.store.load();
	}

	protected isAdmin(user: UserDto): boolean {
		return user.authorities.includes('ADMIN');
	}

	protected isCurrentUser(user: UserDto): boolean {
		return this.todoStore.user()?.id === user.id;
	}

	protected async toggleAdmin(user: UserDto): Promise<void> {
		const admin = !this.isAdmin(user);
		const confirmed = await this.confirmDialog.confirm({
			title: admin ? 'Grant administrator access' : 'Remove administrator access',
			message: admin
				? `Grant administrator access to ${user.username}?`
				: `Remove administrator access from ${user.username}?`,
			confirmLabel: admin ? 'Grant access' : 'Remove access',
			destructive: !admin
		});
		if (!confirmed) return;
		await this.store.setAdmin(user, admin);
	}

	protected async remove(user: UserDto): Promise<void> {
		const confirmed = await this.confirmDialog.confirm({
			title: 'Delete user',
			message: `Delete ${user.username} and every todo that belongs to them?`,
			confirmLabel: 'Delete user',
			destructive: true
		});
		if (!confirmed) return;
		await this.store.remove(user);
	}

	protected close(): void {
		this.dialogRef.close();
	}
}
