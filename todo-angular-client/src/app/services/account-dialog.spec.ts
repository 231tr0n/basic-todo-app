import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AccountDialog } from '../components/account-dialog/account-dialog';
import { AccountDialogService } from './account-dialog';

describe('AccountDialogService', () => {
	it('opens the account dialog and returns its result', async () => {
		const dialogRef = { afterClosed: vi.fn(() => of(true)) };
		const dialog = { open: vi.fn(() => dialogRef) };
		TestBed.configureTestingModule({
			providers: [{ provide: MatDialog, useValue: dialog }]
		});

		const service = TestBed.inject(AccountDialogService);
		await expect(service.open()).resolves.toBe(true);
		expect(dialog.open).toHaveBeenCalledWith(
			AccountDialog,
			expect.objectContaining({ width: '480px', maxWidth: '92vw' })
		);
	});

	it('returns false when the dialog is dismissed', async () => {
		const dialog = { open: vi.fn(() => ({ afterClosed: () => of(undefined) })) };
		TestBed.configureTestingModule({
			providers: [{ provide: MatDialog, useValue: dialog }]
		});

		const service = TestBed.inject(AccountDialogService);
		await expect(service.open()).resolves.toBe(false);
	});
});
