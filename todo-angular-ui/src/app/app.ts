import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Session } from './services/session';
import { GlobalApi } from './services/global-api';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, Navbar],
	templateUrl: './app.html',
	styleUrl: './app.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
	private readonly session = inject(Session);
	private readonly globalApi = inject(GlobalApi);

	ngOnInit() {
		this.globalApi.getUser().subscribe({
			next: (user) => {
				this.session.loggedInUser.next(user);
			},
			error: () => {
				this.session.loggedInUser.next(null);
			}
		});
	}
}
