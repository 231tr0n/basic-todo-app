import { ErrorHandler } from '@angular/core';
export class GlobalErrorHandler implements ErrorHandler {
	handleError(error: unknown) {
		console.error(GlobalErrorHandler.name, { error });
	}
}
