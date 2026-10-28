import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ConfirmDialog } from '../components/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from './confirm-dialog';

describe('ConfirmDialogService', () => {
	let dialog: { open: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		dialog = { open: vi.fn() };
		TestBed.configureTestingModule({
			providers: [{ provide: MatDialog, useValue: dialog }]
		});
	});

	it('returns the confirmation result', async () => {
		dialog.open.mockReturnValue({ afterClosed: () => of(true) });
		const service = TestBed.inject(ConfirmDialogService);

		await expect(
			service.confirm({ title: 'Delete', message: 'Delete it?', destructive: true })
		).resolves.toBe(true);
		expect(dialog.open).toHaveBeenCalledWith(
			ConfirmDialog,
			expect.objectContaining({ width: '420px', maxWidth: '92vw' })
		);
	});

	it('returns false when the dialog is dismissed', async () => {
		dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
		const service = TestBed.inject(ConfirmDialogService);

		await expect(service.confirm({ title: 'Delete', message: 'Delete it?' })).resolves.toBe(false);
	});
});
