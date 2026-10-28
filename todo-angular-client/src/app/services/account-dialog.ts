import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { AccountDialog } from '../components/account-dialog/account-dialog';

@Service()
export class AccountDialogService {
	private readonly dialog = inject(MatDialog);

	async open(): Promise<boolean> {
		const dialogRef = this.dialog.open<AccountDialog, undefined, boolean>(AccountDialog, {
			width: '480px',
			maxWidth: '92vw'
		});
		return (await firstValueFrom(dialogRef.afterClosed())) ?? false;
	}
}
