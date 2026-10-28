import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
	async function render(data: ConfirmDialogData): Promise<HTMLElement> {
		await TestBed.configureTestingModule({
			imports: [ConfirmDialog],
			providers: [{ provide: MAT_DIALOG_DATA, useValue: data }]
		}).compileComponents();

		const fixture = TestBed.createComponent(ConfirmDialog);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it('renders the provided labels', async () => {
		const element = await render({
			title: 'Delete todo',
			message: 'Remove this todo?',
			confirmLabel: 'Delete',
			destructive: true
		});

		expect(element.textContent).toContain('Delete todo');
		expect(element.textContent).toContain('Remove this todo?');
		expect(element.textContent).toContain('Delete');
		expect(element.querySelector('button.destructive')).not.toBeNull();
	});

	it('falls back to a neutral confirmation', async () => {
		const element = await render({ title: 'Proceed', message: 'Continue?' });

		expect(element.textContent).toContain('Confirm');
		expect(element.querySelector('button.destructive')).toBeNull();
	});
});
