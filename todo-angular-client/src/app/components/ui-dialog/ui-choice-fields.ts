import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UiDialogState } from './ui-dialog-state';

@Component({
	selector: 'app-ui-choice-fields',
	imports: [
		FormsModule,
		MatAutocompleteModule,
		MatCheckbox,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule
	],
	templateUrl: './ui-choice-fields.html',
	styleUrl: './ui-choice-fields.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiChoiceFields {
	readonly state = input.required<UiDialogState>();

	protected get label(): string {
		return this.state().data.label ?? 'Value';
	}

	protected get options(): string[] {
		return this.state().data.options ?? [];
	}
}
