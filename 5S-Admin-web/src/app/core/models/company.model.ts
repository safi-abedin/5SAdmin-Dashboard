export interface CompanyDto {
  id: number;
  companyName: string;
  companyCode: string;
  contactPerson: string;
  email: string;
  phone: string;
}

export interface CreateCompanyDto {
  companyName: string;
  companyCode: string;
  contactPerson: string;
  email: string;
  phone: string;
}

export interface UpdateCompanyDto extends CreateCompanyDto {
  id: number;
}
