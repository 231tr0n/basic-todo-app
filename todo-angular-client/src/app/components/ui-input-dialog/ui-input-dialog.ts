import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButton } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
	MAT_DIALOG_DATA,
	MatDialogActions,
	MatDialogContent,
	MatDialogRef,
	MatDialogTitle
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UiInputDialogData, UiInputResult } from '../../types/ui-input';

@Component({
	selector: 'app-ui-input-dialog',
	imports: [
		FormsModule,
		MatAutocompleteModule,
		MatButton,
		MatDatepickerModule,
		MatDialogActions,
		MatDialogContent,
		MatDialogTitle,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule
	],
	templateUrl: './ui-input-dialog.html',
	styleUrl: './ui-input-dialog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiInputDialog {
	private readonly dialogRef = inject(MatDialogRef<UiInputDialog, UiInputResult>);

	protected readonly data = inject<UiInputDialogData>(MAT_DIALOG_DATA);

	protected textValue = this.data.initialValue ?? '';
	protected dateValue: Date | null = null;

	protected readonly options = this.data.options ?? [];

	protected get label(): string {
		return this.data.label ?? 'Value';
	}

	protected get valid(): boolean {
		switch (this.data.kind) {
			case 'confirm':
				return true;
			case 'date':
				return this.dateValue !== null;
			default:
				return this.textValue.trim().length > 0;
		}
	}

	protected confirm(): void {
		if (!this.valid) return;
		switch (this.data.kind) {
			case 'confirm':
				this.dialogRef.close(true);
				return;
			case 'date':
				this.dialogRef.close(this.formatDate(this.dateValue));
				return;
			default:
				this.dialogRef.close(this.textValue.trim());
		}
	}

	protected cancel(): void {
		this.dialogRef.close(null);
	}

	private formatDate(date: Date | null): string | null {
		if (!date) return null;
		const year = date.getFullYear().toString().padStart(4, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
}
