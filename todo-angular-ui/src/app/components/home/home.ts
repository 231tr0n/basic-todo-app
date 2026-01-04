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

@Component({
	selector: 'app-home',
	imports: [MatTab, MatTabGroup, MatCard, MatCardContent, Signup, Signin, UserSettings, TodoGrid],
	templateUrl: './home.html',
	styleUrl: './home.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit, OnDestroy {
	protected user: UserDto | null = null;
	private readonly session = inject(Session);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private sessionSubscription: Subscription | null = null;

	ngOnInit() {
		this.sessionSubscription = this.session.loggedInUser.subscribe((user) => {
			this.user = user;
			this.changeDetector.markForCheck();
		});
	}

	ngOnDestroy() {
		this.sessionSubscription?.unsubscribe();
	}
}
