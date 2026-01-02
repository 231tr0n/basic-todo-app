import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { MatFabButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { GlobalApi } from '../../services/global-api';
import { SignInDto } from '../../types/types';

@Component({
	selector: 'app-signin',
	imports: [MatFormField, MatLabel, MatInput, MatFabButton, MatIcon, ReactiveFormsModule, MatError],
	templateUrl: './signin.html',
	styleUrl: './signin.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signin {
	private readonly globalApi = inject(GlobalApi);
	protected loginFailed = false;

	readonly signInForm = new FormGroup({
		username: new FormControl('', [Validators.required]),
		password: new FormControl('', [Validators.required])
	});

	onSubmit() {
		if (this.signInForm.valid) {
			this.globalApi.signIn(this.signInForm.value as SignInDto).subscribe({
				next: () => {
					this.loginFailed = false;
				},
				error: () => {
					this.loginFailed = true;
				}
			});
		}
	}
}
