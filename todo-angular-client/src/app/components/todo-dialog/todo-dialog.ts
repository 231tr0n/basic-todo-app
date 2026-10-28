import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
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
import { TodoDto, TodoStatus, TODO_COLUMNS, TODO_STATUSES } from '../../types/types';

export interface TodoDialogData {
	readonly todo?: TodoDto;
	readonly status?: TodoStatus;
}

export interface TodoDialogResult {
	readonly title: string;
	readonly description: string;
	readonly status: TodoStatus;
}

@Component({
	selector: 'app-todo-dialog',
	imports: [
		FormsModule,
		MatButton,
		MatDialogActions,
		MatDialogContent,
		MatDialogTitle,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule
	],
	templateUrl: './todo-dialog.html',
	styleUrl: './todo-dialog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoDialog {
	private readonly dialogRef = inject(MatDialogRef<TodoDialog, TodoDialogResult>);

	protected readonly data = inject<TodoDialogData>(MAT_DIALOG_DATA);
	protected readonly statuses = TODO_COLUMNS;
	protected readonly isEdit = this.data.todo !== undefined;

	protected title = this.data.todo?.title ?? '';
	protected description = this.data.todo?.description ?? '';
	protected status: TodoStatus = this.data.todo?.status ?? this.data.status ?? TODO_STATUSES[0];

	protected get valid(): boolean {
		const title = this.title.trim();
		const description = this.description.trim();
		return (
			title.length > 0 && title.length <= 255 && description.length > 0 && description.length <= 255
		);
	}

	protected save(): void {
		if (!this.valid) return;
		this.dialogRef.close({
			title: this.title.trim(),
			description: this.description.trim(),
			status: this.status
		});
	}

	protected cancel(): void {
		this.dialogRef.close();
	}
}
