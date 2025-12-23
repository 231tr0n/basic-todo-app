import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { UserDto } from '../../types/types';
import { Session } from '../../services/session';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-home',
	imports: [MatTab, MatTabGroup, MatFormField, MatInput, MatLabel, MatCard, MatCardContent],
	templateUrl: './home.html',
	styleUrl: './home.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit, OnDestroy {
	protected user: UserDto | null = null;
	private readonly session = inject(Session);
	private sessionSubscription: Subscription | null = null;

	ngOnInit() {
		this.sessionSubscription = this.session.loggedInUser.subscribe((user) => {
			this.user = user;
		});
	}

	ngOnDestroy() {
		this.sessionSubscription?.unsubscribe();
	}
}
