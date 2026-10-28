import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { UsersDialog } from '../components/users-dialog/users-dialog';

@Service()
export class UsersDialogService {
	private readonly dialog = inject(MatDialog);

	async open(): Promise<void> {
		const dialogRef = this.dialog.open<UsersDialog, undefined, undefined>(UsersDialog, {
			width: '640px',
			maxWidth: '94vw'
		});
		await firstValueFrom(dialogRef.afterClosed());
	}
}
