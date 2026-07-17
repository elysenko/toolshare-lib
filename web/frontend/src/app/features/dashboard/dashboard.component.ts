import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OverdueItem } from '../../models/toolshare.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { ToolsService } from '../../core/services/tools.service';

interface CatalogSummary {
  total: number;
  available: number;
  onLoan: number;
  reserved: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private dashboardApi = inject(DashboardService);
  private toolsApi = inject(ToolsService);

  // Loading/error flags reflect real request state.
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Live data — the catalog summary is derived from the tools list; there is no
  // dedicated summary endpoint.
  readonly summary = signal<CatalogSummary>({ total: 0, available: 0, onLoan: 0, reserved: 0 });

  readonly overdue = signal<OverdueItem[]>([]);

  readonly hasOverdue = computed(() => this.overdue().length > 0);

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      overdue: this.dashboardApi.overdue(),
      tools: this.toolsApi.list(),
    }).subscribe({
      next: ({ overdue, tools }) => {
        this.overdue.set(overdue);
        this.summary.set({
          total: tools.length,
          available: tools.filter((t) => t.availability === 'available').length,
          onLoan: tools.filter((t) => t.availability === 'on_loan').length,
          reserved: tools.filter((t) => t.availability === 'reserved').length,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load the dashboard.');
        this.loading.set(false);
      },
    });
  }

  readonly tiles = computed(() => {
    const s = this.summary();
    return [
      { key: 'total', label: 'Tools in catalog', value: s.total, tone: 'plain' },
      { key: 'available', label: 'Available', value: s.available, tone: 'available' },
      { key: 'on_loan', label: 'On loan', value: s.onLoan, tone: 'on_loan' },
      { key: 'reserved', label: 'Reserved', value: s.reserved, tone: 'reserved' },
    ];
  });
}
