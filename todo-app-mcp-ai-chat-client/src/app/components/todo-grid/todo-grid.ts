import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UserDto } from '../../types/types';

@Component({
	selector: 'app-todo-grid',
	imports: [],
	templateUrl: './todo-grid.html',
	styleUrl: './todo-grid.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoGrid {
	readonly user = input<UserDto | null>();
}
