import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './interceptors/error-interceptor';
import { GlobalErrorHandler } from './error';

export const appConfig: ApplicationConfig = {
	providers: [
		{
			provide: ErrorHandler,
			useClass: GlobalErrorHandler
		},
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes),
		provideHttpClient(withInterceptors([errorInterceptor]))
	]
};
