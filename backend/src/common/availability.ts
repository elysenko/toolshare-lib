// Shared availability + overdue derivation.
//
// Availability and daysOverdue are NEVER stored — they are derived at query time
// from the current Loan / Reservation state so flags can never go stale. This is
// the single source of truth used by the tools, loans, reservations and dashboard
// modules to keep their answers consistent.

export type ToolAvailability = 'available' | 'on_loan' | 'reserved';
export type LoanStatus = 'active' | 'overdue' | 'returned';

export interface LoanLike {
  returnedAt: Date | null;
  dueDate: Date;
}

export interface ReservationLike {
  status: string;
  createdAt: Date;
  user?: { email: string } | null;
}

/** A loan is "open" when it has not been returned. */
export function isOpenLoan(loan: LoanLike): boolean {
  return loan.returnedAt === null || loan.returnedAt === undefined;
}

/**
 * Derive a tool's availability from its loans + reservations:
 *  - on_loan  → has an open (unreturned) loan
 *  - reserved → no open loan but at least one ACTIVE reservation
 *  - available otherwise
 */
export function deriveAvailability(
  loans: LoanLike[],
  reservations: ReservationLike[],
): ToolAvailability {
  const hasOpenLoan = loans.some(isOpenLoan);
  if (hasOpenLoan) return 'on_loan';

  const hasActiveReservation = reservations.some((r) => r.status === 'ACTIVE');
  if (hasActiveReservation) return 'reserved';

  return 'available';
}

/**
 * Email of the earliest (FIFO by createdAt) ACTIVE reservation for a tool, or null.
 * This is the "next in line" surfaced on the tool and on loan return.
 */
export function nextInLineEmail(reservations: ReservationLike[]): string | null {
  const active = reservations
    .filter((r) => r.status === 'ACTIVE')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return active[0]?.user?.email ?? null;
}

/**
 * Whole days a loan is overdue (>= 1) — positive only when the loan is open and
 * past its due date. Returns 0 when not overdue.
 */
export function daysOverdue(loan: LoanLike, now: Date = new Date()): number {
  if (!isOpenLoan(loan)) return 0;
  const diffMs = now.getTime() - loan.dueDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Map a single loan to its derived status. */
export function loanStatus(loan: LoanLike, now: Date = new Date()): LoanStatus {
  if (!isOpenLoan(loan)) return 'returned';
  return loan.dueDate.getTime() < now.getTime() ? 'overdue' : 'active';
}
