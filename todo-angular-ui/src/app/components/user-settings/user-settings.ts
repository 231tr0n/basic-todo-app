import { ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { UpdateUserDto, UserDto } from '../../types/types';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
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
		MatFormField
	],
	templateUrl: './user-settings.html',
	styleUrl: './user-settings.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserSettings implements OnInit {
	readonly user = input<UserDto | null>();
	protected readonly adminAuthority = 'ADMIN';
	private readonly globalApi = inject(GlobalApi);

	protected readonly updateUserForm = new FormGroup({
		username: new FormControl(''),
		authorities: new FormControl<string[]>([])
	});

	ngOnInit() {
		this.updateUserForm.setValue({
			username: this.user()?.username ?? '',
			authorities: this.user()?.authorities.map((value) => value.authority) ?? []
		});
	}

	onSubmit() {
		const updateUserDto = {} as UpdateUserDto;
		if (this.updateUserForm.value.username && this.updateUserForm.value.username !== '') {
			updateUserDto.username = this.updateUserForm.value.username;
		}
		if (
			this.updateUserForm.value.authorities &&
			this.updateUserForm.value.authorities.length !== this.user()?.authorities.length
		) {
			updateUserDto.authorities = this.updateUserForm.value.authorities;
		}

		this.globalApi.updateUser(updateUserDto, this.user()?.id).subscribe();
	}
}
