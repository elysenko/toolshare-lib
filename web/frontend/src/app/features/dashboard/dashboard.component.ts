import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OverdueItem } from '../../models/toolshare.models';

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
export class DashboardComponent {
  // Loading/error flags let downstream wiring flip real request state.
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Backend-provided data — declared as signals per the mockup data contract.
  readonly summary = signal<CatalogSummary>({ total: 6, available: 3, onLoan: 2, reserved: 1 });

  readonly overdue = signal<OverdueItem[]>([
    { id: 'o1', toolName: 'Cordless Drill', borrowerName: 'Maria Gonzalez', dueDate: '2026-07-09', daysOverdue: 8 },
    { id: 'o2', toolName: 'Extension Ladder', borrowerName: 'Sam Okafor', dueDate: '2026-07-12', daysOverdue: 5 },
    { id: 'o3', toolName: 'Circular Saw', borrowerName: 'Dana Whitfield', dueDate: '2026-07-15', daysOverdue: 2 },
  ]);

  readonly hasOverdue = computed(() => this.overdue().length > 0);

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
