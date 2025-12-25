import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { GlobalApi } from '../../services/global-api';
import { SignUpDto } from '../../types/types';

@Component({
	selector: 'app-signup',
	imports: [
		MatFormField,
		MatLabel,
		MatInput,
		MatFabButton,
		MatIcon,
		ReactiveFormsModule,
		MatSelect,
		MatOption
	],
	templateUrl: './signup.html',
	styleUrl: './signup.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup {
	protected readonly adminAuthority = 'ADMIN';

	public readonly globalApi = inject(GlobalApi);

	readonly signUpForm = new FormGroup({
		username: new FormControl('', [Validators.required]),
		password: new FormControl('', [Validators.required]),
		authorities: new FormControl([])
	});

	onSubmit() {
		if (this.signUpForm.valid) {
			const signUpDto = this.signUpForm.value as SignUpDto;
			console.log(signUpDto);
			// this.globalApi.signUp(signUpDto);
		}
	}
}
