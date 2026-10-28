import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiDialogData, UiInputResult } from '../../types/ui-dialog';
import { UiDialog } from './ui-dialog';

describe('UiDialog', () => {
	let fixture: ComponentFixture<UiDialog>;
	let element: HTMLElement;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [UiDialog] }).compileComponents();
		fixture = TestBed.createComponent(UiDialog);
		element = fixture.nativeElement as HTMLElement;
	});

	it('renders an input widget with its prompt and submits a typed value', () => {
		const values: UiInputResult[] = [];
		fixture.componentInstance.resolved.subscribe((value) => values.push(value));
		render({ kind: 'text', prompt: 'Your name', description: 'Visible to your team.' });

		expect(text('.description')).toBe('Visible to your team.');
		expect(button('OK').disabled).toBe(true);

		const input = query('input') as HTMLInputElement;
		input.value = 'Alice';
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(button('OK').disabled).toBe(false);
		button('OK').click();

		expect(values).toEqual(['Alice']);
	});

	it('emits null when an input widget is cancelled', () => {
		const values: UiInputResult[] = [];
		fixture.componentInstance.resolved.subscribe((value) => values.push(value));
		render({ kind: 'confirm', prompt: 'Delete everything?' });

		expect(button('Confirm')).toBeTruthy();
		button('Cancel').click();

		expect(values).toEqual([null]);
	});

	it('renders a message widget with only a close action', () => {
		const values: UiInputResult[] = [];
		fixture.componentInstance.resolved.subscribe((value) => values.push(value));
		render({ kind: 'message', title: 'Saved', message: 'The todo was created.' });

		expect(text('mat-card-title')).toBe('Saved');
		expect(text('.message')).toBe('The todo was created.');
		expect(findButton('Cancel')).toBeUndefined();

		button('Close').click();
		expect(values).toEqual([null]);
	});

	it('renders ordered and unordered lists', () => {
		render({ kind: 'list', title: 'Ordered', items: ['One', 'Two'] });

		expect(element.querySelectorAll('ol li').length).toBe(2);

		fixture.componentRef.setInput('data', {
			kind: 'list',
			title: 'Unordered',
			items: ['One'],
			ordered: false
		} satisfies UiDialogData);
		fixture.detectChanges();

		expect(element.querySelectorAll('ul li').length).toBe(1);
	});

	it('renders table columns and rows', () => {
		render({
			kind: 'table',
			title: 'Todos',
			columns: ['Title', 'Status'],
			rows: [['Buy milk', 'NOT_STARTED']]
		});

		expect(text('th')).toBe('Title');
		expect(element.querySelectorAll('th').length).toBe(2);
		expect(element.querySelectorAll('td').length).toBe(2);
	});

	it('renders a checklist with the supplied checked state', () => {
		render({
			kind: 'checklist',
			title: 'Steps',
			items: ['One', 'Two'],
			checked: [true, false]
		});

		const checkboxes = element.querySelectorAll<HTMLElement>('.checklist mat-checkbox');
		expect(checkboxes.length).toBe(2);
		expect(checkboxes[0].classList.contains('mat-mdc-checkbox-checked')).toBe(true);
		expect(checkboxes[1].classList.contains('mat-mdc-checkbox-checked')).toBe(false);
	});

	function query(selector: string): Element {
		const node = element.querySelector(selector);
		if (!node) throw new Error(`Element ${selector} not found`);
		return node;
	}

	function render(data: UiDialogData): void {
		fixture.componentRef.setInput('data', data);
		fixture.detectChanges();
	}

	function text(selector: string): string {
		return (query(selector) as HTMLElement).textContent.trim();
	}

	function findButton(label: string): HTMLButtonElement | undefined {
		const buttons = [...element.querySelectorAll('button')] as HTMLButtonElement[];
		return buttons.find((candidate) => candidate.textContent.trim() === label);
	}

	function button(label: string): HTMLButtonElement {
		const candidate = findButton(label);
		if (!candidate) throw new Error(`Button ${label} not found`);
		return candidate;
	}
});
