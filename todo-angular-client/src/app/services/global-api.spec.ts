import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GlobalApi } from './global-api';

describe('GlobalApi', () => {
	let service: GlobalApi;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(GlobalApi);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
