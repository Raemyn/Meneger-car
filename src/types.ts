export type Client = {
  id: string | number;
  fullName: string;
  phoneNumber: string;
  birthDate: string;
  passportData: string;
  registrationAddress: string;
  created_at?: string;
  updated_at?: string;
};

export type Employee = {
  id: string | number;
  fullName: string;
  specialty: string;
  grade: number;
  experienceYears: number;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
};

export enum FaultStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
}

export const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  [FaultStatus.PENDING]: "Ожидает",
  [FaultStatus.IN_PROGRESS]: "В работе",
  [FaultStatus.RESOLVED]: "Исправлено",
};

export type Fault = {
  id: string | number;
  description: string;
  type: string;
  costParts: number;
  costLabor: number;
  timeHours: number;
  status: FaultStatus;
  assignedWorkerId: string | number;
};

export type Repair = {
  id: string | number;
  carId: string | number;
  clientId: string | number;
  dateReceived: string;
  dateDeadline?: string | null;
  dateFinished?: string | null;
  isArchived: boolean;
  faults: Fault[];
  created_at?: string;
  updated_at?: string;
};

export type Car = {
  id: string | number;
  ownerId: string | number;

  brand?: string;
  make?: string;

  model: string;
  year?: number | null;
  color?: string | null;
  licensePlate: string;

  ownerName?: string;
  client?: Client | null;

  created_at?: string;
  updated_at?: string;
};