import { Component, signal, computed, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ToolsService } from '../../core/services/tools.service';
import {
  Tool,
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
export class ToolsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toolsApi = inject(ToolsService);

  readonly categories = TOOL_CATEGORIES;
  readonly conditions = TOOL_CONDITIONS;
  readonly availabilities = AVAILABILITY_OPTIONS;
  readonly availabilityLabels = AVAILABILITY_LABELS;
  readonly isAdmin = this.auth.isAdmin;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Live catalog data, loaded from GET /api/v1/tools.
  readonly tools = signal<Tool[]>([]);

  ngOnInit(): void {
    this.loadTools();
  }

  private loadTools(): void {
    this.loading.set(true);
    this.error.set(null);
    this.toolsApi.list().subscribe({
      next: (tools) => {
        this.tools.set(tools);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load tools.');
        this.loading.set(false);
      },
    });
  }

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
    const id = this.editId();
    const request$ =
      this.modal() === 'edit-tool' && id
        ? this.toolsApi.update(id, value)
        : this.toolsApi.create(value);
    request$.subscribe({
      next: () => {
        this.loadTools();
        this.closeOverlay();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to save the tool.'),
    });
  }

  deleteTool(tool: Tool): void {
    this.toolsApi.remove(tool.id).subscribe({
      next: () => {
        this.loadTools();
        this.closeOverlay();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete the tool.'),
    });
  }
}
