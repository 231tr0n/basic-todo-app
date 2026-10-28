import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('application configuration', () => {
	it('provides the application dependencies', () => {
		expect(appConfig.providers.length).toBeGreaterThan(0);
	});

	it('declares the board, chat and fallback routes', () => {
		expect(routes.map((route) => route.path)).toEqual(['', 'chat', '**']);
	});
});
