import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoGrid } from './todo-grid';

describe('TodoGrid', () => {
	let component: TodoGrid;
	let fixture: ComponentFixture<TodoGrid>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TodoGrid]
		}).compileComponents();

		fixture = TestBed.createComponent(TodoGrid);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
