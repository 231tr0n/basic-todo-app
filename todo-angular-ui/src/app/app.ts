import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Session } from './services/session';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, Navbar],
	templateUrl: './app.html',
	styleUrl: './app.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
	private readonly session = inject(Session);

	ngOnInit() {
		this.session.loggedInUser.subscribe((value) => {
			if (value) {
				console.log('User logged in: ', value);
			} else {
				console.log('User logged out or session has expired.');
			}
		});
	}
}
