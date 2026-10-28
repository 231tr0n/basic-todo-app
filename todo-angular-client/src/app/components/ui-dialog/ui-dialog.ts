import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
	UiDialogData,
	UiDisplayDialogData,
	UiDisplayKind,
	UiInputDialogData,
	UiInputResult
} from '../../types/ui-dialog';
import { UiChoiceFields } from './ui-choice-fields';
import { UiDialogState } from './ui-dialog-state';
import { UiDisplayContent } from './ui-display-content';
import { UiValueFields } from './ui-value-fields';

const DISPLAY_KINDS: readonly UiDisplayKind[] = ['message', 'list', 'table', 'checklist'];

@Component({
	selector: 'app-ui-dialog',
	imports: [MatButton, MatCardModule, UiChoiceFields, UiDisplayContent, UiValueFields],
	templateUrl: './ui-dialog.html',
	styleUrl: './ui-dialog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiDialog {
	readonly data = input.required<UiDialogData>();
	readonly resolved = output<UiInputResult>();

	protected readonly isDisplay = computed(() =>
		DISPLAY_KINDS.includes(this.data().kind as UiDisplayKind)
	);
	protected readonly state = computed<UiDialogState | null>(() =>
		this.isDisplay() ? null : new UiDialogState(this.data() as UiInputDialogData)
	);
	protected readonly displayData = computed<UiDisplayDialogData | null>(() =>
		this.isDisplay() ? (this.data() as UiDisplayDialogData) : null
	);

	protected readonly title = computed(
		() => this.displayData()?.title ?? this.state()?.data.prompt ?? ''
	);

	protected confirm(): void {
		const state = this.state();
		if (!state?.valid) return;
		this.resolved.emit(state.value);
	}

	protected close(): void {
		this.resolved.emit(null);
	}
}
