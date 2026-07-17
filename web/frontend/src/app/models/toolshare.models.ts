// Domain types for the ToolShare mockup. Mirrors the backend surface contract.

export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export type ToolCategory = 'Power' | 'Hand' | 'Garden' | 'Measurement';
export type ToolCondition = 'New' | 'Good' | 'Fair' | 'Worn';
export type ToolAvailability = 'available' | 'on_loan' | 'reserved';

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  availability: ToolAvailability;
  /** Email of the earliest ACTIVE reservation (FIFO next-in-line), if any. */
  nextInLine: string | null;
  createdAt: string;
}

export interface Loan {
  id: string;
  toolId: string;
  toolName: string;
  borrowerName: string;
  dueDate: string;
  returnedAt: string | null;
  createdAt: string;
}

export type LoanStatus = 'active' | 'overdue' | 'returned';

export type ReservationStatus = 'ACTIVE' | 'FULFILLED' | 'CANCELLED';

export interface Reservation {
  id: string;
  toolId: string;
  toolName: string;
  userEmail: string;
  status: ReservationStatus;
  /** FIFO position among ACTIVE reservations for the tool (1 = next in line). */
  position: number;
  createdAt: string;
}

export interface OverdueItem {
  id: string;
  toolName: string;
  borrowerName: string;
  dueDate: string;
  daysOverdue: number;
}

export interface ServiceSetting {
  key: string;
  label: string;
  description: string;
  configured: boolean;
  maskedValue: string;
  fields: { name: string; label: string; type: 'text' | 'password'; placeholder: string }[];
}

export const TOOL_CATEGORIES: ToolCategory[] = ['Power', 'Hand', 'Garden', 'Measurement'];
export const TOOL_CONDITIONS: ToolCondition[] = ['New', 'Good', 'Fair', 'Worn'];
export const AVAILABILITY_OPTIONS: ToolAvailability[] = ['available', 'on_loan', 'reserved'];

export const AVAILABILITY_LABELS: Record<ToolAvailability, string> = {
  available: 'Available',
  on_loan: 'On loan',
  reserved: 'Reserved',
};
