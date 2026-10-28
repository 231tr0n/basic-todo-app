import { TestBed } from '@angular/core/testing';
import { UiDisplayDialogData, UiInputDialogData } from '../types/ui-dialog';
import { UiDialogService } from './ui-dialog';

describe('UiDialogService', () => {
	let service: UiDialogService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [UiDialogService] });
		service = TestBed.inject(UiDialogService);
	});

	it('queues input requests and exposes the first one as active', () => {
		const data: UiInputDialogData = { kind: 'text', prompt: 'Name' };

		const result = service.ask(data);

		expect(service.hasActive()).toBe(true);
		expect(service.active()).toEqual({ id: 1, data });
		expect(result).toBeInstanceOf(Promise);
	});

	it('resolves an input request with its value and removes it from the queue', async () => {
		const result = service.ask({ kind: 'text', prompt: 'Name' });

		service.resolve(1, 'Alice');

		await expect(result).resolves.toBe('Alice');
		expect(service.hasActive()).toBe(false);
		expect(service.active()).toBeNull();
	});

	it('resolves cancellation with null', async () => {
		const result = service.ask({ kind: 'confirm', prompt: 'Sure?' });

		service.resolve(1, null);

		await expect(result).resolves.toBeNull();
	});

	it('resolves a display request without a value', async () => {
		const data: UiDisplayDialogData = { kind: 'message', title: 'Notice', message: 'Saved' };

		const result = service.show(data);

		expect(service.active()).toEqual({ id: 1, data });
		service.resolve(1, null);

		await expect(result).resolves.toBeUndefined();
	});

	it('advances through queued requests one at a time', async () => {
		const first = service.ask({ kind: 'text', prompt: 'One' });
		const second = service.ask({ kind: 'text', prompt: 'Two' });

		expect(service.active()?.id).toBe(1);
		service.resolve(1, 'first');

		await expect(first).resolves.toBe('first');
		expect(service.active()?.id).toBe(2);

		service.resolve(2, 'second');
		await expect(second).resolves.toBe('second');
		expect(service.hasActive()).toBe(false);
	});

	it('ignores unknown and repeated resolutions', async () => {
		const result = service.ask({ kind: 'text', prompt: 'Name' });

		service.resolve(99, 'unknown');
		service.resolve(1, 'first');
		service.resolve(1, 'second');

		await expect(result).resolves.toBe('first');
		expect(service.hasActive()).toBe(false);
	});

	it('cancels every queued request once', async () => {
		const first = service.ask({ kind: 'text', prompt: 'One' });
		const second = service.show({ kind: 'message', title: 'Two' });

		service.closeAll();

		await expect(first).resolves.toBeNull();
		await expect(second).resolves.toBeUndefined();
		expect(service.hasActive()).toBe(false);
		expect(service.active()).toBeNull();

		service.closeAll();
		expect(service.hasActive()).toBe(false);
	});
});
