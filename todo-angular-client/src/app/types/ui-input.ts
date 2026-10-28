export type UiInputKind =
	'text' | 'multiline' | 'select' | 'combobox' | 'date' | 'time' | 'confirm';

export interface UiInputDialogData {
	kind: UiInputKind;
	prompt: string;
	label?: string | undefined;
	options?: string[] | undefined;
	initialValue?: string | undefined;
	description?: string | undefined;
}

export type UiInputResult = string | boolean | null;
