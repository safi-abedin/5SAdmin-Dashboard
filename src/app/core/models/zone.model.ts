export interface ZoneDto {
  id: number;
  name: string;
}

export interface CreateZoneDto {
  name: string;
}

export interface UpdateZoneDto extends CreateZoneDto {
  id: number;
}
