import { UiInputDialogData } from '../../types/ui-dialog';
import { UiDialogState } from './ui-dialog-state';

function state(data: Partial<UiInputDialogData> & Pick<UiInputDialogData, 'kind'>): UiDialogState {
	return new UiDialogState({ prompt: 'Prompt', ...data });
}

describe('UiDialogState', () => {
	it('normalises single-line and multi-line text', () => {
		const text = state({ kind: 'text', initialValue: '  hello  ' });
		expect(text.valid).toBe(true);
		expect(text.value).toBe('hello');

		text.textValue = '   ';
		expect(text.valid).toBe(false);

		const multiline = state({ kind: 'multiline', initialValue: 'one\ntwo' });
		expect(multiline.valid).toBe(true);
		expect(multiline.value).toBe('one\ntwo');
	});

	it('validates numeric bounds and rejects non-numeric input', () => {
		const number = state({ kind: 'number', initialValue: '5', min: 1, max: 10 });
		expect(number.valid).toBe(true);
		expect(number.value).toBe('5');

		number.numberValue = 0;
		expect(number.valid).toBe(false);

		number.numberValue = 11;
		expect(number.valid).toBe(false);

		number.numberValue = null;
		expect(number.valid).toBe(false);

		const invalid = state({ kind: 'number', initialValue: 'abc' });
		expect(invalid.numberValue).toBeNull();
		expect(invalid.valid).toBe(false);
	});

	it('returns the selected option and the initial selection', () => {
		const select = state({ kind: 'select', options: ['A', 'B'], initialValue: 'B' });
		expect(select.value).toBe('B');

		const combobox = state({ kind: 'combobox', options: ['A', 'B'], initialValue: 'custom' });
		expect(combobox.value).toBe('custom');
	});

	it('tracks multiselect values in option order', () => {
		const multiselect = state({
			kind: 'multiselect',
			options: ['A', 'B', 'C'],
			initialValues: ['C']
		});
		expect(multiselect.valid).toBe(true);
		expect(multiselect.value).toEqual(['C']);

		multiselect.toggleOption('A', true);
		multiselect.toggleOption('C', false);
		expect(multiselect.value).toEqual(['A']);
		expect(multiselect.selectedValues.has('A')).toBe(true);
		expect(multiselect.selectedValues.has('C')).toBe(false);
		expect(state({ kind: 'multiselect' }).value).toEqual([]);
	});

	it('formats dates and date ranges as ISO values', () => {
		const date = state({ kind: 'date' });
		expect(date.valid).toBe(false);
		date.dateValue = new Date(2026, 9, 29);
		expect(date.valid).toBe(true);
		expect(date.value).toBe('2026-10-29');

		const range = state({ kind: 'date-range' });
		expect(range.valid).toBe(false);
		range.dateValue = new Date(2026, 9, 1);
		expect(range.valid).toBe(false);
		range.endDateValue = new Date(2026, 9, 5);
		expect(range.valid).toBe(true);
		expect(range.value).toEqual({ start: '2026-10-01', end: '2026-10-05' });
	});

	it('handles single and range times', () => {
		const time = state({ kind: 'time', initialValue: '12:30' });
		expect(time.valid).toBe(true);
		expect(time.value).toBe('12:30');

		const range = state({ kind: 'time-range', initialValue: '09:00' });
		expect(range.valid).toBe(false);
		range.endTextValue = '17:00';
		expect(range.valid).toBe(true);
		expect(range.value).toEqual({ start: '09:00', end: '17:00' });
	});

	it('always allows confirmation and identifies choice kinds', () => {
		const confirm = state({ kind: 'confirm' });
		expect(confirm.valid).toBe(true);
		expect(confirm.value).toBe(true);

		expect(state({ kind: 'select' }).isChoice).toBe(true);
		expect(state({ kind: 'multiselect' }).isChoice).toBe(true);
		expect(state({ kind: 'combobox' }).isChoice).toBe(true);
		expect(state({ kind: 'text' }).isChoice).toBe(false);
		expect(state({ kind: 'date' }).isChoice).toBe(false);
	});
});
