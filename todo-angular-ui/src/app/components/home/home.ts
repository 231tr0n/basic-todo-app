import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTab, MatTabGroup } from '@angular/material/tabs';

@Component({
	selector: 'app-home',
	imports: [MatTab, MatTabGroup],
	templateUrl: './home.html',
	styleUrl: './home.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {}
