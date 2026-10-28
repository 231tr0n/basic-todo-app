import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { AuthDialog, AuthDialogData, AuthMode } from '../components/auth-dialog/auth-dialog';

@Service()
export class AuthDialogService {
	private readonly dialog = inject(MatDialog);

	async open(mode: AuthMode = 'sign-in'): Promise<boolean> {
		const dialogRef = this.dialog.open<AuthDialog, AuthDialogData, boolean>(AuthDialog, {
			data: { mode },
			width: '440px',
			maxWidth: '92vw'
		});
		return (await firstValueFrom(dialogRef.afterClosed())) ?? false;
	}
}
