import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, finalize, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (!shouldRefresh(error, req.url)) {
        return throwError(() => error);
      }

      if (!authService.getRefreshToken()) {
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (isRefreshing) {
        return waitForRefreshedToken(req, next);
      }

      isRefreshing = true;
      refreshedToken$.next(null);

      return authService.refreshToken().pipe(
        switchMap((session) => {
          refreshedToken$.next(session.token);
          return next(withToken(req, session.token));
        }),
        catchError((refreshError: unknown) => {
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
        finalize(() => {
          isRefreshing = false;
        })
      );
    })
  );
};

function shouldRefresh(error: HttpErrorResponse, url: string): boolean {
  if (error.status !== 401) {
    return false;
  }

  return !isAuthEndpoint(url);
}

function isAuthEndpoint(url: string): boolean {
  const normalized = url.toLowerCase();
  return normalized.includes('/auth/login') || normalized.includes('/auth/refresh-token');
}

function waitForRefreshedToken(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  return refreshedToken$.pipe(
    filter((token): token is string => typeof token === 'string' && token.trim().length > 0),
    take(1),
    switchMap((token) => next(withToken(req, token)))
  );
}

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
