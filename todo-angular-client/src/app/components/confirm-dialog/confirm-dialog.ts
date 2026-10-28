import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
	MAT_DIALOG_DATA,
	MatDialogActions,
	MatDialogClose,
	MatDialogContent,
	MatDialogTitle
} from '@angular/material/dialog';

export interface ConfirmDialogData {
	readonly title: string;
	readonly message: string;
	readonly confirmLabel?: string;
	readonly destructive?: boolean;
}

@Component({
	selector: 'app-confirm-dialog',
	imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
	templateUrl: './confirm-dialog.html',
	styleUrl: './confirm-dialog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialog {
	protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
