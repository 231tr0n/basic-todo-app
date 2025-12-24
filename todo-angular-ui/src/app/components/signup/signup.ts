import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

@Component({
	selector: 'app-signup',
	imports: [MatFormField, MatLabel, MatInput, MatFabButton, MatIcon],
	templateUrl: './signup.html',
	styleUrl: './signup.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup {}
