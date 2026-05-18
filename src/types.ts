export type Client = {
  id: number;
  fullName: string;
  phoneNumber: string;
  birthDate: string;
  passportData: string;
  registrationAddress: string;
  created_at?: string;
  updated_at?: string;
};

export type Employee = {
  id: number;
  fullName: string;
  specialty: string;
  grade: number;
  experienceYears: number;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RepairFault = {
  category: string;
  description: string;
};

export type Repair = {
  id: number;
  carId: number;
  clientId: number;
  masterId?: number | null;
  expectedReturnDate: string;
  laborHours: number;
  laborCost: number;
  partsCost: number;
  isArchived: boolean;
  faults: RepairFault[];
  created_at?: string;
  updated_at?: string;
};

export type RepairCreate = {
  carId: number;
  clientId: number;
  masterId?: number;
  expectedReturnDate: string;
  laborHours: number;
  laborCost: number;
  partsCost: number;
  faults: RepairFault[];
  isArchived?: boolean;
};

export type Car = {
  id: number;
  ownerId: number;
  brand: string;
  model: string;
  year?: number | null;
  color?: string | null;
  licensePlate: string;
  ownerName?: string;
  client?: Client | null;
  created_at?: string;
  updated_at?: string;
};