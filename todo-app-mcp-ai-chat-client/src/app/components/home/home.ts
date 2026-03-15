import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	inject,
	OnDestroy,
	OnInit
} from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { UserDto } from '../../types/types';
import { Session } from '../../services/session';
import { Subscription } from 'rxjs';
import { Signup } from '../signup/signup';
import { Signin } from '../signin/signin';
import { UserSettings } from '../user-settings/user-settings';
import { TodoGrid } from '../todo-grid/todo-grid';
import { GlobalApi } from '../../services/global-api';
import { MatFormField, MatOption, MatSelect } from '@angular/material/select';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
	selector: 'app-home',
	imports: [
		MatTab,
		MatTabGroup,
		MatCard,
		MatCardContent,
		Signup,
		Signin,
		UserSettings,
		TodoGrid,
		MatSelect,
		MatOption,
		MatFormField,
		MatFabButton,
		MatIcon
	],
	templateUrl: './home.html',
	styleUrl: './home.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit, OnDestroy {
	protected loggedInUser: UserDto | null = null;
	protected selectedUser!: UserDto;
	private readonly session = inject(Session);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private sessionSubscription: Subscription | null = null;
	private readonly globalApi = inject(GlobalApi);
	protected users: UserDto[] = [];

	ngOnInit() {
		this.sessionSubscription = this.session.loggedInUser.subscribe((user) => {
			this.loggedInUser = user;
			this.changeDetector.markForCheck();
			if (user) {
				this.onClickRefresh();
			}
		});
	}

	onClickRefresh() {
		this.globalApi.getUsers().subscribe((users) => {
			this.users = users;
			this.selectedUser =
				this.users.find((user) => user.id === this.loggedInUser?.id) ?? this.users[0];
			this.changeDetector.markForCheck();
		});
	}

	onClickDelete() {
		this.globalApi.deleteUser(this.selectedUser.id).subscribe(() => {
			this.changeDetector.markForCheck();
		});
	}

	ngOnDestroy() {
		this.sessionSubscription?.unsubscribe();
	}
}
