import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { AuthDialogService } from '../../services/auth-dialog';
import { TodoStore } from '../../services/todo-store';
import { TodoDto, TodoStatus, isTodoStatus } from '../../types/types';
import { TodoDialog, TodoDialogData, TodoDialogResult } from '../todo-dialog/todo-dialog';

@Component({
	selector: 'app-board',
	imports: [
		CdkDrag,
		CdkDropList,
		CdkDropListGroup,
		MatButton,
		MatCardModule,
		MatIcon,
		MatIconButton,
		MatMenuModule,
		MatProgressBar,
		MatTooltip
	],
	templateUrl: './board.html',
	styleUrl: './board.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Board implements OnDestroy {
	protected readonly store = inject(TodoStore);
	private readonly dialog = inject(MatDialog);
	private readonly authDialog = inject(AuthDialogService);
	private readonly openDialogs = new Set<MatDialogRef<TodoDialog, TodoDialogResult>>();

	ngOnDestroy(): void {
		for (const dialogRef of this.openDialogs) {
			dialogRef.close();
		}
		this.openDialogs.clear();
	}

	protected get todoCount(): number {
		return this.store.todos().length;
	}

	protected get completedCount(): number {
		return this.store.todos().filter((todo) => todo.status === 'COMPLETED').length;
	}

	protected async onCreate(status: TodoStatus = 'NOT_STARTED'): Promise<void> {
		const result = await this.openTodoDialog({ status });
		if (!result) return;
		const created = await this.store.create({
			title: result.title,
			description: result.description
		});
		if (!created) return;
		if (result.status !== created.status) {
			await this.store.changeStatus(created, result.status);
		}
	}

	protected async onEdit(todo: TodoDto): Promise<void> {
		const result = await this.openTodoDialog({ todo });
		if (!result) return;
		if (result.title !== todo.title || result.description !== todo.description) {
			const updated = await this.store.update(todo, {
				title: result.title,
				description: result.description
			});
			if (!updated) return;
		}
		if (result.status !== todo.status) {
			await this.store.changeStatus(todo, result.status);
		}
	}

	protected async onDelete(todo: TodoDto): Promise<void> {
		await this.store.remove(todo);
	}

	protected async onDrop(event: CdkDragDrop<TodoDto[]>): Promise<void> {
		const todo: unknown = event.item.data;
		if (!this.isTodo(todo)) return;
		const status = event.container.id;
		if (!isTodoStatus(status)) return;
		await this.store.changeStatus(todo, status);
	}

	protected async onSignIn(): Promise<void> {
		await this.authDialog.open('sign-in');
	}

	protected async onClearCompleted(): Promise<void> {
		await this.store.removeCompleted();
	}

	private async openTodoDialog(data: TodoDialogData): Promise<TodoDialogResult | undefined> {
		const dialogRef = this.dialog.open<TodoDialog, TodoDialogData, TodoDialogResult>(TodoDialog, {
			data,
			width: '480px',
			maxWidth: '92vw'
		});
		this.openDialogs.add(dialogRef);
		try {
			return await firstValueFrom(dialogRef.afterClosed());
		} finally {
			this.openDialogs.delete(dialogRef);
		}
	}

	private isTodo(value: unknown): value is TodoDto {
		if (typeof value !== 'object' || value === null) return false;
		const candidate = value as Partial<TodoDto>;
		return (
			typeof candidate.id === 'number' &&
			typeof candidate.title === 'string' &&
			typeof candidate.description === 'string' &&
			typeof candidate.status === 'string'
		);
	}
}
