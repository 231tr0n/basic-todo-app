import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
	selector: 'app-error',
	imports: [MatFabButton, MatIcon],
	templateUrl: './error.html',
	styleUrl: './error.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Error {
	private readonly router = inject(Router);

	async onClick() {
		await this.router.navigate(['/']);
	}
}
