import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { errorInterceptor } from './error-interceptor';

describe('errorInterceptor', () => {
	const interceptor: HttpInterceptorFn = (req, next) =>
		TestBed.runInInjectionContext(() => errorInterceptor(req, next));

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
	});

	it('should be created', () => {
		expect(interceptor).toBeTruthy();
	});
});
