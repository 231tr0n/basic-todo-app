import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { UserDto } from '../../types/types';
import { Session } from '../../services/session';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-navbar',
	imports: [MatIcon, MatMiniFabButton, MatToolbar],
	templateUrl: './navbar.html',
	styleUrl: './navbar.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Navbar implements OnInit, OnDestroy {
	protected darkMode = false;
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

	toggleMode() {
		if (document.body.classList.contains('dark')) {
			document.body.classList.remove('dark');
			this.darkMode = false;
		} else {
			document.body.classList.add('dark');
			this.darkMode = true;
		}
	}
}
