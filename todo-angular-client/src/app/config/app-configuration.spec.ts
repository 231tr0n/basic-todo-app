import { AppConfiguration } from './app-configuration';

describe('AppConfiguration', () => {
	it('builds the AI endpoint from the current origin', () => {
		const configuration = new AppConfiguration();

		expect(configuration.aiBaseUrl).toBe(`${window.location.origin}/api/ai`);
	});
});
