import { UiInputDialogData, UiInputResult } from '../../types/ui-dialog';

export class UiDialogState {
	readonly data: UiInputDialogData;
	readonly selectedValues: Set<string>;

	textValue: string;
	endTextValue = '';
	numberValue: number | null;
	dateValue: Date | null = null;
	endDateValue: Date | null = null;

	constructor(data: UiInputDialogData) {
		this.data = data;
		this.textValue = data.initialValue ?? '';
		this.numberValue = this.parseNumber(data.initialValue);
		this.selectedValues = new Set(data.initialValues ?? []);
	}

	get isChoice(): boolean {
		return (
			this.data.kind === 'select' ||
			this.data.kind === 'multiselect' ||
			this.data.kind === 'combobox'
		);
	}

	get valid(): boolean {
		switch (this.data.kind) {
			case 'confirm':
				return true;
			case 'date':
				return this.dateValue !== null;
			case 'date-range':
				return (
					this.dateValue !== null &&
					this.endDateValue !== null &&
					this.dateValue.getTime() <= this.endDateValue.getTime()
				);
			case 'time-range':
				return (
					this.textValue.trim().length > 0 &&
					this.endTextValue.trim().length > 0 &&
					this.textValue.trim() <= this.endTextValue.trim()
				);
			case 'number':
				return (
					this.numberValue !== null &&
					Number.isFinite(this.numberValue) &&
					(this.data.min === undefined || this.numberValue >= this.data.min) &&
					(this.data.max === undefined || this.numberValue <= this.data.max)
				);
			case 'multiselect':
				return true;
			case 'select':
				return (this.data.options ?? []).includes(this.textValue);
			default:
				return this.textValue.trim().length > 0;
		}
	}

	get value(): UiInputResult {
		switch (this.data.kind) {
			case 'confirm':
				return true;
			case 'date':
				return this.formatDate(this.dateValue) ?? '';
			case 'date-range':
				return {
					start: this.formatDate(this.dateValue) ?? '',
					end: this.formatDate(this.endDateValue) ?? ''
				};
			case 'time-range':
				return { start: this.textValue.trim(), end: this.endTextValue.trim() };
			case 'number':
				return this.numberValue?.toString() ?? '';
			case 'multiselect':
				return (this.data.options ?? []).filter((option) => this.selectedValues.has(option));
			default:
				return this.textValue.trim();
		}
	}

	toggleOption(option: string, checked: boolean): void {
		if (checked) {
			this.selectedValues.add(option);
		} else {
			this.selectedValues.delete(option);
		}
	}

	private parseNumber(value?: string): number | null {
		if (value === undefined || value.trim().length === 0) return null;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	private formatDate(date: Date | null): string | null {
		if (!date) return null;
		const year = date.getFullYear().toString().padStart(4, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
}
