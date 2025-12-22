import { HttpInterceptorFn } from '@angular/common/http';
import { isDevMode } from '@angular/core';

export const hostnameInterceptor: HttpInterceptorFn = (req, next) => {
	if (isDevMode()) {
		const reqModified = req.clone({
			url: 'http://localhost:9000'
		});
		return next(reqModified);
	}
	return next(req);
};
