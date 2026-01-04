import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UserDto } from '../../types/types';

@Component({
	selector: 'app-user-settings',
	imports: [],
	templateUrl: './user-settings.html',
	styleUrl: './user-settings.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserSettings {
	readonly user = input<UserDto | null>();
}
