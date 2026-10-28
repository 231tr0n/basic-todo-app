import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthDialog } from '../components/auth-dialog/auth-dialog';
import { AuthDialogService } from './auth-dialog';

describe('AuthDialogService', () => {
	let dialog: { open: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		dialog = { open: vi.fn() };
		TestBed.configureTestingModule({
			providers: [
				{ provide: MatDialog, useValue: dialog },
				{ provide: MAT_DIALOG_DATA, useValue: { mode: 'sign-in' } }
			]
		});
	});

	it('opens the requested authentication mode', async () => {
		dialog.open.mockReturnValue({ afterClosed: () => of(true) });
		const service = TestBed.inject(AuthDialogService);

		await expect(service.open('sign-up')).resolves.toBe(true);
		expect(dialog.open).toHaveBeenCalledWith(
			AuthDialog,
			expect.objectContaining({
				data: { mode: 'sign-up' },
				width: '440px',
				maxWidth: '92vw'
			})
		);
	});

	it('defaults to sign-in and returns false when dismissed', async () => {
		dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
		const service = TestBed.inject(AuthDialogService);

		await expect(service.open()).resolves.toBe(false);
		expect(dialog.open).toHaveBeenCalledWith(
			AuthDialog,
			expect.objectContaining({ data: { mode: 'sign-in' } })
		);
	});
});
