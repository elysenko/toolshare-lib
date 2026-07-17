import { Component, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import {
  Tool,
  ToolAvailability,
  ToolCategory,
  ToolCondition,
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
  AVAILABILITY_OPTIONS,
  AVAILABILITY_LABELS,
} from '../../models/toolshare.models';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.css',
})
export class ToolsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly categories = TOOL_CATEGORIES;
  readonly conditions = TOOL_CONDITIONS;
  readonly availabilities = AVAILABILITY_OPTIONS;
  readonly availabilityLabels = AVAILABILITY_LABELS;
  readonly isAdmin = this.auth.isAdmin;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Backend-provided data — signal per the mockup data contract.
  readonly tools = signal<Tool[]>([
    { id: 't1', name: 'Cordless Drill', category: 'Power', condition: 'Good', availability: 'available', nextInLine: null, createdAt: '2026-06-01' },
    { id: 't2', name: 'Circular Saw', category: 'Power', condition: 'Fair', availability: 'on_loan', nextInLine: 'lena@toolshare.dev', createdAt: '2026-06-02' },
    { id: 't3', name: 'Claw Hammer', category: 'Hand', condition: 'New', availability: 'available', nextInLine: null, createdAt: '2026-06-03' },
    { id: 't4', name: 'Garden Spade', category: 'Garden', condition: 'Good', availability: 'reserved', nextInLine: 'sam@toolshare.dev', createdAt: '2026-06-04' },
    { id: 't5', name: 'Laser Measure', category: 'Measurement', condition: 'New', availability: 'available', nextInLine: null, createdAt: '2026-06-05' },
    { id: 't6', name: 'Extension Ladder', category: 'Hand', condition: 'Worn', availability: 'on_loan', nextInLine: null, createdAt: '2026-06-06' },
  ]);

  // URL-addressable state derived from query params.
  private params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly q = computed(() => this.params().get('q') ?? '');
  readonly category = computed(() => this.params().get('category') ?? '');
  readonly status = computed(() => this.params().get('status') ?? '');
  readonly modal = computed(() => this.params().get('modal'));
  readonly panelId = computed(() => this.params().get('panel'));
  private editId = computed(() => this.params().get('id'));

  readonly panelTool = computed(() => this.tools().find((t) => t.id === this.panelId()) ?? null);
  readonly editingTool = computed(() => this.tools().find((t) => t.id === this.editId()) ?? null);

  readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const cat = this.category();
    const st = this.status();
    return this.tools().filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (cat && t.category !== cat) return false;
      if (st && t.availability !== st) return false;
      return true;
    });
  });

  readonly toolForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    category: ['Power' as ToolCategory, [Validators.required]],
    condition: ['Good' as ToolCondition, [Validators.required]],
  });

  constructor() {
    // Keep the modal form in sync with the deep-linked edit target.
    effect(() => {
      const m = this.modal();
      const editing = this.editingTool();
      if (m === 'edit-tool' && editing) {
        this.toolForm.setValue({ name: editing.name, category: editing.category, condition: editing.condition });
      } else if (m === 'new-tool') {
        this.toolForm.reset({ name: '', category: 'Power', condition: 'Good' });
      }
    });
  }

  private setParams(patch: Record<string, string | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
    });
  }

  onSearch(value: string): void {
    this.setParams({ q: value || null });
  }
  onCategory(value: string): void {
    this.setParams({ category: value || null });
  }
  onStatus(value: string): void {
    this.setParams({ status: value || null });
  }
  clearFilters(): void {
    this.setParams({ q: null, category: null, status: null });
  }

  openNew(): void {
    this.setParams({ modal: 'new-tool', id: null });
  }
  openEdit(tool: Tool): void {
    this.setParams({ modal: 'edit-tool', id: tool.id, panel: null });
  }
  openPanel(tool: Tool): void {
    this.setParams({ panel: tool.id });
  }
  closeOverlay(): void {
    this.setParams({ modal: null, id: null, panel: null });
  }

  saveTool(): void {
    if (this.toolForm.invalid) return;
    const value = this.toolForm.value as { name: string; category: ToolCategory; condition: ToolCondition };
    if (this.modal() === 'edit-tool') {
      const id = this.editId();
      this.tools.update((list) => list.map((t) => (t.id === id ? { ...t, ...value } : t)));
    } else {
      const newTool: Tool = {
        id: 't' + (this.tools().length + 1) + '-new',
        name: value.name,
        category: value.category,
        condition: value.condition,
        availability: 'available' as ToolAvailability,
        nextInLine: null,
        createdAt: '2026-07-17',
      };
      this.tools.update((list) => [newTool, ...list]);
    }
    this.closeOverlay();
  }

  deleteTool(tool: Tool): void {
    this.tools.update((list) => list.filter((t) => t.id !== tool.id));
    this.closeOverlay();
  }
}
