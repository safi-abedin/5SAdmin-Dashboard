import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';
import {
  ApiAuthResponseDto,
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest
} from '../models/auth.model';
import { Role } from '../models/role.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(BaseApiService);
  private readonly tokenKey = 'token';
  private readonly refreshTokenKey = 'refreshToken';
  private readonly roleKey = 'role';
  private readonly companyIdKey = 'companyId';
  private readonly usernameKey = 'username';

  private readonly tokenSignal = signal<string | null>(localStorage.getItem(this.tokenKey));
  private readonly refreshTokenSignal = signal<string | null>(
    localStorage.getItem(this.refreshTokenKey)
  );
  private readonly roleSignal = signal<Role | null>(this.normalizeStoredRole());
  private readonly companyIdSignal = signal<number | null>(this.readStoredCompanyId());
  private readonly usernameSignal = signal<string | null>(localStorage.getItem(this.usernameKey));

  readonly isLoggedIn = computed(() => Boolean(this.tokenSignal()));

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.api.post<ApiAuthResponseDto>('auth/login', payload).pipe(
      map((response) => this.normalizeAuthResponse(response)),
      tap((response) => this.persistSession(response))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!token || !refreshToken) {
      return throwError(() => new Error('No refresh session is available.'));
    }

    const payload: RefreshTokenRequest = {
      Token: token,
      RefreshToken: refreshToken
    };

    return this.api.post<ApiAuthResponseDto>('auth/refresh-token', payload).pipe(
      map((response) => this.normalizeAuthResponse(response)),
      tap((response) => this.persistSession(response))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.companyIdKey);
    localStorage.removeItem(this.usernameKey);
    this.tokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.roleSignal.set(null);
    this.companyIdSignal.set(null);
    this.usernameSignal.set(null);
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSignal();
  }

  getRole(): Role | null {
    return this.roleSignal();
  }

  getCompanyId(): number | null {
    return this.companyIdSignal();
  }

  getUsername(): string | null {
    return this.usernameSignal();
  }

  hasRole(role: Role | string): boolean {
    return this.roleSignal() === role;
  }

  hasAnyRole(roles: (Role | string)[]): boolean {
    const activeRole = this.roleSignal();
    return activeRole ? roles.includes(activeRole) : false;
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    localStorage.setItem(this.roleKey, response.role);
    if (response.companyId !== null) {
      localStorage.setItem(this.companyIdKey, String(response.companyId));
    } else {
      localStorage.removeItem(this.companyIdKey);
    }

    localStorage.setItem(this.usernameKey, response.username);

    this.tokenSignal.set(response.token);
    this.refreshTokenSignal.set(response.refreshToken);
    this.roleSignal.set(response.role);
    this.companyIdSignal.set(response.companyId);
    this.usernameSignal.set(response.username);
  }

  private normalizeAuthResponse(response: unknown): AuthResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid login response from server.');
    }

    const data = response as Partial<ApiAuthResponseDto> & Record<string, unknown>;
    const token = this.readString(data, ['Token', 'token']);
    const refreshToken = this.readString(data, ['RefreshToken', 'refreshToken']);

    if (!token) {
      throw new Error('Token was not returned by the server.');
    }

    if (!refreshToken) {
      throw new Error('Refresh token was not returned by the server.');
    }

    const roleFromBody = this.readString(data, ['Role', 'role']);
    const roleFromToken = this.extractRoleFromToken(token);
    const resolvedRole = this.toRole(roleFromBody ?? roleFromToken);

    if (!resolvedRole) {
      throw new Error('Role was not returned by the server.');
    }

    const username = this.readString(data, ['Username', 'username']) ?? '';
    if (!username) {
      throw new Error('Username was not returned by the server.');
    }

    const companyId = this.readCompanyId(data, ['CompanyId', 'companyId']);

    return {
      token,
      refreshToken,
      role: resolvedRole,
      companyId,
      username
    };
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private readCompanyId(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }

  private toRole(value: string | null): Role | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === Role.SUPER_ADMIN) {
      return Role.SUPER_ADMIN;
    }

    if (normalized === Role.ADMIN || normalized === 'companyadmin') {
      return Role.ADMIN;
    }

    return null;
  }

  private extractRoleFromToken(token: string): string | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payloadJson = this.decodeBase64Url(parts[1]);
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;

      const claimKeys = [
        'role',
        'roles',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
      ];

      for (const key of claimKeys) {
        const value = payload[key];
        if (typeof value === 'string' && value.trim()) {
          return value;
        }

        if (Array.isArray(value)) {
          const firstValue = value.find((item) => typeof item === 'string' && item.trim());
          if (typeof firstValue === 'string') {
            return firstValue;
          }
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    return atob(padded);
  }

  private readStoredCompanyId(): number | null {
    const raw = localStorage.getItem(this.companyIdKey);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeStoredRole(): Role | null {
    const rawRole = localStorage.getItem(this.roleKey);
    const normalizedRole = this.toRole(rawRole);

    if (rawRole && normalizedRole) {
      localStorage.setItem(this.roleKey, normalizedRole);
    }

    return normalizedRole;
  }
}
