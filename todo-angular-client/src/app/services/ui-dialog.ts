import { computed, Service, signal } from '@angular/core';
import {
	UiDialogData,
	UiDialogRequest,
	UiInputDialogData,
	UiInputResult
} from '../types/ui-dialog';

@Service()
export class UiDialogService {
	private readonly requests = signal<readonly UiDialogRequest[]>([]);
	private readonly resolvers = new Map<number, (value: UiInputResult) => void>();
	private nextId = 1;

	readonly active = computed<UiDialogRequest | null>(() => this.requests()[0] ?? null);
	readonly hasActive = computed(() => this.requests().length > 0);

	ask(data: UiInputDialogData): Promise<UiInputResult> {
		return new Promise<UiInputResult>((resolve) => {
			this.enqueue(data, resolve);
		});
	}

	show(data: UiDialogData): Promise<void> {
		return new Promise<void>((resolve) => {
			this.enqueue(data, () => {
				resolve();
			});
		});
	}

	resolve(id: number, value: UiInputResult): void {
		const resolver = this.resolvers.get(id);
		if (!resolver) return;
		this.resolvers.delete(id);
		this.requests.update((requests) => requests.filter((request) => request.id !== id));
		resolver(value);
	}

	closeAll(): void {
		const resolvers = [...this.resolvers.values()];
		this.resolvers.clear();
		this.requests.set([]);
		for (const resolve of resolvers) {
			resolve(null);
		}
	}

	private enqueue(data: UiDialogData, resolve: (value: UiInputResult) => void): void {
		const id = this.nextId;
		this.nextId += 1;
		this.resolvers.set(id, resolve);
		this.requests.update((requests) => [...requests, { id, data }]);
	}
}
