import { ErrorHandler } from '@angular/core';

export class GlobalErrorHandler implements ErrorHandler {
	handleError(error: unknown): void {
		console.error('GlobalErrorHandler', { error });
	}
}
