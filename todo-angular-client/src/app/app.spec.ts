import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
	let httpMock: HttpTestingController;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [App],
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
		}).compileComponents();
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should create the app', () => {
		const fixture = TestBed.createComponent(App);
		const app = fixture.componentInstance;
		httpMock
			.expectOne('/api/users/0')
			.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
		expect(app).toBeTruthy();
	});
});
