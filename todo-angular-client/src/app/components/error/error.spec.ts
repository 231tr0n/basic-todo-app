import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { Error } from './error';

interface ErrorInternals {
	onClick(): Promise<void>;
}

describe('Error', () => {
	it('navigates back to the board', async () => {
		const router = { navigate: vi.fn().mockResolvedValue(true) };
		TestBed.configureTestingModule({
			providers: [{ provide: Router, useValue: router }]
		});
		const component = TestBed.createComponent(Error).componentInstance as unknown as ErrorInternals;

		await component.onClick();

		expect(router.navigate).toHaveBeenCalledWith(['/']);
	});
});
