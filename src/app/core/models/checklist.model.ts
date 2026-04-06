export interface ChecklistDto {
  id: number;
  categoryId: number;
  categoryName: string;
  checkingItemName: string;
  evaluationCriteria: string;
  maxScore: number;
  order: number;
}

export interface CreateChecklistDto {
  categoryId: number;
  checkingItemName: string;
  evaluationCriteria: string;
  maxScore: number;
  order: number;
}

export interface UpdateChecklistDto extends CreateChecklistDto {
  id: number;
}
