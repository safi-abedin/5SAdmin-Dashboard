export interface UserProfileResponseDto {
  userId: number;
  name: string;
  userName: string;
  role: string;
  companyId: number | null;
  companyName: string;
  companyAddress: string;
  companyLogoUrl: string;
  email: string;
  phone: string;
}

export interface CompanyBrandingUpdateResponseDto {
  id: number;
  companyAddress: string;
  logoUrl: string;
}
