import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { LoansService } from '../../core/services/loans.service';
import { ToolsService } from '../../core/services/tools.service';
import { Loan, LoanStatus } from '../../models/toolshare.models';

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
export class LoansComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private loansApi = inject(LoansService);
  private toolsApi = inject(ToolsService);

  readonly isAdmin = this.auth.isAdmin;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly statuses: { key: '' | LoanStatus; label: string }[] = [
    { key: '', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'returned', label: 'Returned' },
  ];

  // Live loan data, loaded from GET /api/v1/loans.
  readonly loans = signal<Loan[]>([]);

  // Tools eligible to loan out (available) — used by the new-loan form.
  readonly loanableTools = signal<{ id: string; name: string }[]>([]);

  private params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly status = computed(() => this.params().get('status') ?? '');
  readonly modal = computed(() => this.params().get('modal'));

  ngOnInit(): void {
    this.loadLoans();
    this.loadLoanableTools();
  }

  private loadLoans(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loansApi.list().subscribe({
      next: (loans) => {
        this.loans.set(loans);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load loans.');
        this.loading.set(false);
      },
    });
  }

  private loadLoanableTools(): void {
    this.toolsApi.list({ status: 'available' }).subscribe({
      next: (tools) => this.loanableTools.set(tools.map((t) => ({ id: t.id, name: t.name }))),
      error: () => this.loanableTools.set([]),
    });
  }

  private daysBetween(due: string): number {
    const d = Date.parse(due);
    const t = Date.now();
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
    this.loansApi
      .create({
        toolId: v.toolId,
        borrowerName: v.borrowerName,
        dueDate: new Date(v.dueDate).toISOString(),
      })
      .subscribe({
        next: () => {
          this.loadLoans();
          this.loadLoanableTools();
          this.closeModal();
        },
        error: (err) => this.error.set(err?.error?.message ?? 'Failed to create the loan.'),
      });
  }

  returnLoan(row: LoanRow): void {
    this.loansApi.returnLoan(row.id).subscribe({
      next: () => {
        this.loadLoans();
        this.loadLoanableTools();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to return the loan.'),
    });
  }
}
