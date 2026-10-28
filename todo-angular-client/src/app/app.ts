import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatAnchor, MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountDialogService } from './services/account-dialog';
import { AuthDialogService } from './services/auth-dialog';
import { TodoStore } from './services/todo-store';
import { UsersDialogService } from './services/users-dialog';

@Component({
	selector: 'app-root',
	imports: [
		MatAnchor,
		MatButton,
		MatIcon,
		MatIconButton,
		MatMenuModule,
		MatToolbar,
		RouterLink,
		RouterLinkActive,
		RouterOutlet
	],
	templateUrl: './app.html',
	styleUrl: './app.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
	private readonly authDialog = inject(AuthDialogService);
	private readonly accountDialog = inject(AccountDialogService);
	private readonly usersDialog = inject(UsersDialogService);
	protected readonly store = inject(TodoStore);

	readonly title = 'Kanban Todo';

	protected darkMode = false;

	constructor() {
		this.darkMode = document.body.classList.contains('dark');
	}

	protected toggleTheme(): void {
		this.darkMode = !this.darkMode;
		document.body.classList.toggle('dark', this.darkMode);
	}

	protected async openAuth(mode: 'sign-in' | 'sign-up'): Promise<void> {
		await this.authDialog.open(mode);
	}

	protected async openAccount(): Promise<void> {
		await this.accountDialog.open();
	}

	protected async openUsers(): Promise<void> {
		await this.usersDialog.open();
	}

	protected async signOut(): Promise<void> {
		await this.store.signOut();
	}
}
