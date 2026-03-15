import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, Navbar],
	templateUrl: './app.html',
	styleUrl: './app.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
	readonly sessions = new Map<string, string[]>();
}
