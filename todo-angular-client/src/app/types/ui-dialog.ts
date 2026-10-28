export type UiInputKind =
	| 'text'
	| 'multiline'
	| 'number'
	| 'select'
	| 'multiselect'
	| 'combobox'
	| 'date'
	| 'date-range'
	| 'time'
	| 'time-range'
	| 'confirm';

export type UiDisplayKind = 'message' | 'list' | 'table' | 'checklist';

export type UiDialogKind = UiInputKind | UiDisplayKind;

export interface UiInputDialogData {
	readonly kind: UiInputKind;
	readonly prompt: string;
	readonly label?: string | undefined;
	readonly description?: string | undefined;
	readonly options?: string[] | undefined;
	readonly initialValue?: string | undefined;
	readonly initialValues?: string[] | undefined;
	readonly min?: number | undefined;
	readonly max?: number | undefined;
}

export interface UiDisplayDialogData {
	readonly kind: UiDisplayKind;
	readonly title: string;
	readonly message?: string | undefined;
	readonly items?: string[] | undefined;
	readonly columns?: string[] | undefined;
	readonly rows?: string[][] | undefined;
	readonly checked?: boolean[] | undefined;
	readonly ordered?: boolean | undefined;
}

export type UiDialogData = UiInputDialogData | UiDisplayDialogData;

export interface UiDialogRequest {
	readonly id: number;
	readonly data: UiDialogData;
}

export type UiInputResult = string | string[] | { start: string; end: string } | boolean | null;
