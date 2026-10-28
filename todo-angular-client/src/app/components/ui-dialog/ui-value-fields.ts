import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UiDialogState } from './ui-dialog-state';

@Component({
	selector: 'app-ui-value-fields',
	imports: [FormsModule, MatDatepickerModule, MatFormFieldModule, MatInputModule],
	templateUrl: './ui-value-fields.html',
	styleUrl: './ui-value-fields.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiValueFields {
	readonly state = input.required<UiDialogState>();

	protected get label(): string {
		return this.state().data.label ?? 'Value';
	}
}
