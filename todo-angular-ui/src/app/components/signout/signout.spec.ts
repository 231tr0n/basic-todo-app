import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Signout } from './signout';

describe('Signout', () => {
	let component: Signout;
	let fixture: ComponentFixture<Signout>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Signout]
		}).compileComponents();

		fixture = TestBed.createComponent(Signout);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
