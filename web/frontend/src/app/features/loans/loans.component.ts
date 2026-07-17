import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { Loan, LoanStatus } from '../../models/toolshare.models';

const TODAY = '2026-07-17';

interface LoanRow extends Loan {
  status: LoanStatus;
  daysOverdue: number;
}

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.css',
})
export class LoansComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly isAdmin = this.auth.isAdmin;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly statuses: { key: '' | LoanStatus; label: string }[] = [
    { key: '', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'returned', label: 'Returned' },
  ];

  // Backend-provided data — signal per the mockup data contract.
  readonly loans = signal<Loan[]>([
    { id: 'l1', toolId: 't2', toolName: 'Circular Saw', borrowerName: 'Maria Gonzalez', dueDate: '2026-07-09', returnedAt: null, createdAt: '2026-06-25' },
    { id: 'l2', toolId: 't6', toolName: 'Extension Ladder', borrowerName: 'Sam Okafor', dueDate: '2026-07-24', returnedAt: null, createdAt: '2026-07-10' },
    { id: 'l3', toolId: 't1', toolName: 'Cordless Drill', borrowerName: 'Dana Whitfield', dueDate: '2026-07-15', returnedAt: null, createdAt: '2026-07-01' },
    { id: 'l4', toolId: 't3', toolName: 'Claw Hammer', borrowerName: 'Leah Kim', dueDate: '2026-07-05', returnedAt: '2026-07-04', createdAt: '2026-06-20' },
  ]);

  // Tools eligible to loan out — used by the new-loan form.
  readonly loanableTools = signal<{ id: string; name: string }[]>([
    { id: 't1', name: 'Cordless Drill' },
    { id: 't3', name: 'Claw Hammer' },
    { id: 't5', name: 'Laser Measure' },
  ]);

  private params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly status = computed(() => this.params().get('status') ?? '');
  readonly modal = computed(() => this.params().get('modal'));

  private daysBetween(due: string): number {
    const d = Date.parse(due);
    const t = Date.parse(TODAY);
    return Math.floor((t - d) / 86_400_000);
  }

  private toRow(loan: Loan): LoanRow {
    let status: LoanStatus = 'active';
    let daysOverdue = 0;
    if (loan.returnedAt) {
      status = 'returned';
    } else if (this.daysBetween(loan.dueDate) > 0) {
      status = 'overdue';
      daysOverdue = this.daysBetween(loan.dueDate);
    }
    return { ...loan, status, daysOverdue };
  }

  readonly rows = computed<LoanRow[]>(() => {
    const st = this.status();
    return this.loans()
      .map((l) => this.toRow(l))
      .filter((r) => !st || r.status === st);
  });

  readonly loanForm: FormGroup = this.fb.group({
    toolId: ['', [Validators.required]],
    borrowerName: ['', [Validators.required]],
    dueDate: ['', [Validators.required]],
  });

  private setParams(patch: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: patch, queryParamsHandling: 'merge' });
  }

  setStatus(value: string): void {
    this.setParams({ status: value || null });
  }
  openNew(): void {
    this.loanForm.reset({ toolId: '', borrowerName: '', dueDate: '' });
    this.setParams({ modal: 'new-loan' });
  }
  closeModal(): void {
    this.setParams({ modal: null });
  }

  createLoan(): void {
    if (this.loanForm.invalid) return;
    const v = this.loanForm.value as { toolId: string; borrowerName: string; dueDate: string };
    const tool = this.loanableTools().find((t) => t.id === v.toolId);
    const loan: Loan = {
      id: 'l' + (this.loans().length + 1) + '-new',
      toolId: v.toolId,
      toolName: tool?.name ?? 'Tool',
      borrowerName: v.borrowerName,
      dueDate: v.dueDate,
      returnedAt: null,
      createdAt: TODAY,
    };
    this.loans.update((list) => [loan, ...list]);
    this.closeModal();
  }

  returnLoan(row: LoanRow): void {
    this.loans.update((list) => list.map((l) => (l.id === row.id ? { ...l, returnedAt: TODAY } : l)));
  }
}
