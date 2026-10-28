import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, throwError } from 'rxjs';
import { vi } from 'vitest';
import { GlobalApi } from '../services/global-api';
import { errorInterceptor } from './error-interceptor';

describe('errorInterceptor', () => {
	let globalApi: { clearLoggedInUser: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		globalApi = { clearLoggedInUser: vi.fn() };
		TestBed.configureTestingModule({
			providers: [{ provide: GlobalApi, useValue: globalApi }]
		});
	});

	it('clears the current user on unauthorized responses', async () => {
		const request = new HttpRequest('GET', '/api/users/0');
		const error = new HttpErrorResponse({ status: 401 });

		const result = TestBed.runInInjectionContext(() =>
			firstValueFrom(errorInterceptor(request, () => throwError(() => error)))
		);

		await expect(result).rejects.toBe(error);
		expect(globalApi.clearLoggedInUser).toHaveBeenCalled();
	});

	it('keeps the current user on other errors', async () => {
		const request = new HttpRequest('GET', '/api/users/0');
		const error = new HttpErrorResponse({ status: 500 });

		const result = TestBed.runInInjectionContext(() =>
			firstValueFrom(errorInterceptor(request, () => throwError(() => error)))
		);

		await expect(result).rejects.toBe(error);
		expect(globalApi.clearLoggedInUser).not.toHaveBeenCalled();
	});
});
