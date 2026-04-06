import { Role } from './role.model';

export interface LoginRequest {
  CompanyCode: string;
  Username: string;
  Password: string;
}

export interface RefreshTokenRequest {
  Token: string;
  RefreshToken: string;
}

export interface ApiAuthResponseDto {
  Token: string;
  RefreshToken: string;
  CompanyId: number | null;
  Role: string;
  Username: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  role: Role;
  companyId: number | null;
  username: string;
}
