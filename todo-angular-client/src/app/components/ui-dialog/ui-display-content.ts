import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { UiDisplayDialogData } from '../../types/ui-dialog';

@Component({
	selector: 'app-ui-display-content',
	imports: [MatCheckbox],
	templateUrl: './ui-display-content.html',
	styleUrl: './ui-display-content.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiDisplayContent {
	readonly display = input.required<UiDisplayDialogData>();
}
