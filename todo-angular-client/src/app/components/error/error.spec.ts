import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Error } from './error';

describe('Error', () => {
	let component: Error;
	let fixture: ComponentFixture<Error>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Error],
			providers: [provideRouter([])]
		}).compileComponents();

		fixture = TestBed.createComponent(Error);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
