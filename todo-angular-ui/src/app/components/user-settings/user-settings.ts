import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	effect,
	inject,
	input,
	OnInit
} from '@angular/core';
import { PatchUserDto, UpdateUserDto, UserDto } from '../../types/types';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatFabButton } from '@angular/material/button';
import { MatOption, MatSelect } from '@angular/material/select';
import { GlobalApi } from '../../services/global-api';

@Component({
	selector: 'app-user-settings',
	imports: [
		ReactiveFormsModule,
		MatIcon,
		MatInput,
		MatFabButton,
		MatSelect,
		MatOption,
		MatLabel,
		MatFormField,
		MatError
	],
	templateUrl: './user-settings.html',
	styleUrl: './user-settings.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserSettings implements OnInit {
	readonly user = input.required<UserDto>();
	protected readonly adminAuthority = 'ADMIN';
	private readonly globalApi = inject(GlobalApi);
	private readonly changeDetector = inject(ChangeDetectorRef);
	protected userUpdateFailed = false;
	protected userPasswordFailed = false;

	protected readonly updateUserForm = new FormGroup({
		username: new FormControl('', [Validators.min(1)]),
		authorities: new FormControl<string[]>([])
	});

	protected readonly updatePasswordForm = new FormGroup({
		oldPassword: new FormControl('', [Validators.required]),
		newPassword: new FormControl('', [Validators.required])
	});

	constructor() {
		effect(() => {
			this.updateUserForm.setValue({
				username: this.user().username,
				authorities: this.user().authorities.map((value) => value.authority)
			});
		});
	}

	ngOnInit() {
		this.updateUserForm.setValue({
			username: this.user().username,
			authorities: this.user().authorities.map((value) => value.authority)
		});
	}

	onUserFormSubmit() {
		this.globalApi
			.updateUser(this.updateUserForm.getRawValue() as UpdateUserDto, this.user().id)
			.subscribe({
				next: () => {
					this.userUpdateFailed = false;
					this.changeDetector.markForCheck();
				},
				error: () => {
					this.userUpdateFailed = true;
					this.changeDetector.markForCheck();
				}
			});
	}

	onPasswordFormSubmit() {
		this.globalApi
			.patchUser(this.updatePasswordForm.getRawValue() as PatchUserDto, this.user().id)
			.subscribe({
				next: () => {
					this.userPasswordFailed = false;
					this.changeDetector.markForCheck();
				},
				error: () => {
					this.userPasswordFailed = true;
					this.changeDetector.markForCheck();
				}
			});
	}
}
