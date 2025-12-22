import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';

@Component({
	selector: 'app-header',
	imports: [MatToolbar, MatIcon, MatButton],
	templateUrl: './header.html',
	styleUrl: './header.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Navbar {}
