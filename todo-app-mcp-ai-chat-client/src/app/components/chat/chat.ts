import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatFormField, MatOption, MatSelect } from '@angular/material/select';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
	selector: 'app-home',
	imports: [
		MatTab,
		MatTabGroup,
		MatCard,
		MatCardContent,
		MatSelect,
		MatOption,
		MatFormField,
		MatFabButton,
		MatIcon
	],
	templateUrl: './chat.html',
	styleUrl: './chat.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Chat {
	protected readonly message: string = '';
	readonly session = input<string[]>();
	readonly chatMessageEvent = output<string>();

	onClick() {
		if (this.message && this.message.length > 0) {
			this.chatMessageEvent.emit(this.message);
		}
	}
}
