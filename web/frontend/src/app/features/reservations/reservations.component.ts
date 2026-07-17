import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ReservationsService } from '../../core/services/reservations.service';
import { ToolsService } from '../../core/services/tools.service';
import { Reservation } from '../../models/toolshare.models';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reservations.component.html',
  styleUrl: './reservations.component.css',
})
export class ReservationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private reservationsApi = inject(ReservationsService);
  private toolsApi = inject(ToolsService);

  readonly currentUser = this.auth.currentUser;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Live reservation data, loaded from GET /api/v1/reservations.
  readonly reservations = signal<Reservation[]>([]);

  // On-loan tools a USER can reserve (backend-derived availability).
  readonly reservableTools = signal<{ id: string; name: string }[]>([]);

  private params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly modal = computed(() => this.params().get('modal'));

  ngOnInit(): void {
    this.loadReservations();
    this.loadReservableTools();
  }

  private loadReservations(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reservationsApi.list().subscribe({
      next: (reservations) => {
        this.reservations.set(reservations);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load reservations.');
        this.loading.set(false);
      },
    });
  }

  private loadReservableTools(): void {
    this.toolsApi.list({ status: 'on_loan' }).subscribe({
      next: (tools) => this.reservableTools.set(tools.map((t) => ({ id: t.id, name: t.name }))),
      error: () => this.reservableTools.set([]),
    });
  }

  readonly activeReservations = computed(() =>
    this.reservations().filter((r) => r.status === 'ACTIVE'),
  );

  readonly reserveForm: FormGroup = this.fb.group({
    toolId: ['', [Validators.required]],
  });

  private setParams(patch: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: patch, queryParamsHandling: 'merge' });
  }

  openReserve(): void {
    this.reserveForm.reset({ toolId: '' });
    this.setParams({ modal: 'reserve' });
  }
  closeModal(): void {
    this.setParams({ modal: null });
  }

  reserve(): void {
    if (this.reserveForm.invalid) return;
    const toolId = this.reserveForm.value.toolId as string;
    this.reservationsApi.create(toolId).subscribe({
      next: () => {
        this.loadReservations();
        this.closeModal();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to create the reservation.'),
    });
  }

  // NOTE: the backend exposes no cancel/DELETE endpoint for reservations, so this
  // remains an optimistic client-side update (does not persist server-side).
  cancel(reservation: Reservation): void {
    this.reservations.update((list) =>
      list.map((r) => (r.id === reservation.id ? { ...r, status: 'CANCELLED' } : r)),
    );
  }
}
