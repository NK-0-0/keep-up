import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { SKIP_LOADING } from './http.context';
import { LoadingService } from './loading.service';

/**
 * Feeds the global progress indicator. Sits near the top of the chain so one
 * logical request counts once, however many times it is retried.
 */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_LOADING)) return next(request);

  const loading = inject(LoadingService);
  loading.start();

  return next(request).pipe(finalize(() => loading.stop()));
};
