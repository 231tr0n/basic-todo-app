import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardContent } from '@angular/material/card';

@Component({
	selector: 'app-signup',
	imports: [MatCardContent],
	templateUrl: './signup.html',
	styleUrl: './signup.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup {}
