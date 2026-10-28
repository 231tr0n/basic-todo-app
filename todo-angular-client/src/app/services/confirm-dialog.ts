import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog';

@Service()
export class ConfirmDialogService {
	private readonly dialog = inject(MatDialog);

	async confirm(data: ConfirmDialogData): Promise<boolean> {
		const dialogRef = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
			data,
			width: '420px',
			maxWidth: '92vw'
		});
		return (await firstValueFrom(dialogRef.afterClosed())) ?? false;
	}
}
