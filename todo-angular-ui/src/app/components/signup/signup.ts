import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFabButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
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
		MatOption,
		MatError
	],
	templateUrl: './signup.html',
	styleUrl: './signup.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup {
	protected readonly adminAuthority = 'ADMIN';
	protected signUpFailed = false;
	public readonly changeDetector = inject(ChangeDetectorRef);
	public readonly globalApi = inject(GlobalApi);

	readonly signUpForm = new FormGroup({
		username: new FormControl('', [Validators.required]),
		password: new FormControl('', [Validators.required]),
		authorities: new FormControl([])
	});

	onSubmit() {
		if (this.signUpForm.valid) {
			this.globalApi.signUp(this.signUpForm.value as SignUpDto).subscribe({
				next: () => {
					this.signUpFailed = false;
					this.changeDetector.markForCheck();
				},
				error: () => {
					this.signUpFailed = true;
					this.changeDetector.markForCheck();
				}
			});
		}
	}
}
