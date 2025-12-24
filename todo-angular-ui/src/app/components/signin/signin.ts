import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFabButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

@Component({
	selector: 'app-signin',
	imports: [MatFormField, MatLabel, MatInput, MatFabButton, MatIcon, ReactiveFormsModule, MatError],
	templateUrl: './signin.html',
	styleUrl: './signin.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signin {
	private readonly formBuilder = inject(FormBuilder);

	readonly signInForm = this.formBuilder.group({
		username: ['', Validators.required],
		password: ['', Validators.required]
	});
}
