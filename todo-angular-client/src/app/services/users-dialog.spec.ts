import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { UsersDialog } from '../components/users-dialog/users-dialog';
import { UsersDialogService } from './users-dialog';

describe('UsersDialogService', () => {
	it('opens and waits for the users dialog', async () => {
		const dialogRef = { afterClosed: vi.fn(() => of(undefined)) };
		const dialog = { open: vi.fn(() => dialogRef) };
		TestBed.configureTestingModule({
			providers: [{ provide: MatDialog, useValue: dialog }]
		});

		const service = TestBed.inject(UsersDialogService);
		await expect(service.open()).resolves.toBeUndefined();
		expect(dialog.open).toHaveBeenCalledWith(
			UsersDialog,
			expect.objectContaining({ width: '640px', maxWidth: '94vw' })
		);
	});
});
