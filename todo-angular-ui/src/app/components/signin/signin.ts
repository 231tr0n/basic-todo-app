import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { GlobalApi } from '../../services/global-api';
import { SignInDto } from '../../types/types';

@Component({
	selector: 'app-signin',
	imports: [MatFormField, MatLabel, MatInput, MatFabButton, MatIcon, ReactiveFormsModule],
	templateUrl: './signin.html',
	styleUrl: './signin.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signin {
	public readonly globalApi = inject(GlobalApi);

	readonly signInForm = new FormGroup({
		username: new FormControl('', [Validators.required]),
		password: new FormControl('', [Validators.required])
	});

	onSubmit() {
		if (this.signInForm.valid) {
			const signInDto = this.signInForm.value as SignInDto;
			console.log(signInDto);
			// this.globalApi.signIn(signInDto);
		}
	}
}
