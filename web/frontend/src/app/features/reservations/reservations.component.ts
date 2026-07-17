import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { Reservation } from '../../models/toolshare.models';

const TODAY = '2026-07-17';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reservations.component.html',
  styleUrl: './reservations.component.css',
})
export class ReservationsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Backend-provided data — signal per the mockup data contract.
  readonly reservations = signal<Reservation[]>([
    { id: 'r1', toolId: 't2', toolName: 'Circular Saw', userEmail: 'lena@toolshare.dev', status: 'ACTIVE', position: 1, createdAt: '2026-07-11' },
    { id: 'r2', toolId: 't2', toolName: 'Circular Saw', userEmail: 'raj@toolshare.dev', status: 'ACTIVE', position: 2, createdAt: '2026-07-13' },
    { id: 'r3', toolId: 't4', toolName: 'Garden Spade', userEmail: 'sam@toolshare.dev', status: 'ACTIVE', position: 1, createdAt: '2026-07-14' },
    { id: 'r4', toolId: 't6', toolName: 'Extension Ladder', userEmail: 'dana@toolshare.dev', status: 'FULFILLED', position: 1, createdAt: '2026-07-02' },
  ]);

  // On-loan tools a USER can reserve (backend-derived availability).
  readonly reservableTools = signal<{ id: string; name: string }[]>([
    { id: 't2', name: 'Circular Saw' },
    { id: 't6', name: 'Extension Ladder' },
  ]);

  private params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly modal = computed(() => this.params().get('modal'));

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
    const tool = this.reservableTools().find((t) => t.id === toolId);
    const email = this.currentUser()?.email ?? 'you@toolshare.dev';
    const position = this.reservations().filter((r) => r.toolId === toolId && r.status === 'ACTIVE').length + 1;
    const reservation: Reservation = {
      id: 'r' + (this.reservations().length + 1) + '-new',
      toolId,
      toolName: tool?.name ?? 'Tool',
      userEmail: email,
      status: 'ACTIVE',
      position,
      createdAt: TODAY,
    };
    this.reservations.update((list) => [...list, reservation]);
    this.closeModal();
  }

  cancel(reservation: Reservation): void {
    this.reservations.update((list) =>
      list.map((r) => (r.id === reservation.id ? { ...r, status: 'CANCELLED' } : r)),
    );
  }
}
