import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';

@Component({
	selector: 'app-navbar',
	imports: [MatIcon, MatButton, MatToolbar],
	templateUrl: './navbar.html',
	styleUrl: './navbar.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Navbar {}
