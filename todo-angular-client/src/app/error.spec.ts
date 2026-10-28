import { vi } from 'vitest';
import { GlobalErrorHandler } from './error';

describe('GlobalErrorHandler', () => {
	it('logs the error with the handler name', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const error = new Error('offline');

		new GlobalErrorHandler().handleError(error);

		expect(consoleError).toHaveBeenCalledWith(GlobalErrorHandler.name, { error });
		consoleError.mockRestore();
	});
});
