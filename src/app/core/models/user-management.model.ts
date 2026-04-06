export interface UserDto {
  id: number;
  name: string;
  username: string;
  role: string;
  companyId: number | null;
  companyName: string | null;
}

export interface CreateUserDto {
  name: string;
  username: string;
  password: string;
  role: string;
  companyId: number | null;
}

export interface UpdateUserDto extends CreateUserDto {
  id: number;
}

export interface UserRoleOption {
  value: string;
  label: string;
}
