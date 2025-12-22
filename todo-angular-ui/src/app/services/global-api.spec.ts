import { TestBed } from '@angular/core/testing';

import { GlobalApi } from './global-api';

describe('GlobalApi', () => {
	let service: GlobalApi;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(GlobalApi);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
