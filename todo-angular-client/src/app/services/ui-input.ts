import { inject, Service } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { UiInputDialog } from '../components/ui-input-dialog/ui-input-dialog';
import { UiInputDialogData, UiInputResult } from '../types/ui-input';

@Service()
export class UiInputService {
	private readonly dialog = inject(MatDialog);
	private readonly openDialogs = new Set<MatDialogRef<UiInputDialog, UiInputResult>>();

	async ask(data: UiInputDialogData): Promise<UiInputResult> {
		const dialogRef = this.dialog.open<UiInputDialog, UiInputDialogData, UiInputResult>(
			UiInputDialog,
			{
				data,
				width: '460px',
				maxWidth: '92vw',
				autoFocus: 'first-tabbable'
			}
		);
		this.openDialogs.add(dialogRef);
		try {
			return (await firstValueFrom(dialogRef.afterClosed())) ?? null;
		} finally {
			this.openDialogs.delete(dialogRef);
		}
	}

	closeAll(): void {
		for (const dialogRef of [...this.openDialogs]) {
			dialogRef.close(null);
		}
		this.openDialogs.clear();
	}
}
