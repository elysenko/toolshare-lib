import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceSetting } from '../../models/toolshare.models';
import { SettingsService, BackendSetting } from '../../core/services/settings.service';

/**
 * Static field schemas per service key. The backend admin-settings API stores a
 * single opaque value per service and never returns field-level data, so the form
 * shape lives here and the live `configured` / `maskedValue` flags are overlaid
 * from GET /api/v1/admin/settings.
 */
const FIELD_DEFS: Record<string, ServiceSetting['fields']> = {
  postgresql: [
    { name: 'host', label: 'Host', type: 'text', placeholder: 'db.internal' },
    { name: 'database', label: 'Database', type: 'text', placeholder: 'toolshare' },
    { name: 'user', label: 'User', type: 'text', placeholder: 'toolshare_app' },
    { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
  ],
  minio: [
    { name: 'endpoint', label: 'Endpoint', type: 'text', placeholder: 'minio.internal:9000' },
    { name: 'accessKey', label: 'Access key', type: 'text', placeholder: 'AKIA…' },
    { name: 'secretKey', label: 'Secret key', type: 'password', placeholder: '••••••••' },
    { name: 'bucket', label: 'Bucket', type: 'text', placeholder: 'toolshare-media' },
  ],
};

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
})
export class AdminSettingsComponent implements OnInit {
  private settingsApi = inject(SettingsService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedKey = signal<string | null>(null);

  // Live service settings, loaded from GET /api/v1/admin/settings.
  readonly services = signal<ServiceSetting[]>([]);

  // Editable drafts keyed by service.key -> field.name.
  readonly drafts: Record<string, Record<string, string>> = {
    postgresql: {},
    minio: {},
  };

  ngOnInit(): void {
    this.load();
  }

  private toServiceSetting(row: BackendSetting): ServiceSetting {
    return {
      key: row.key,
      label: row.label,
      description: row.description,
      configured: row.configured,
      maskedValue: row.maskedValue,
      fields: FIELD_DEFS[row.key] ?? [],
    };
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settingsApi.list().subscribe({
      next: (rows) => {
        this.services.set(rows.map((r) => this.toServiceSetting(r)));
        for (const r of rows) {
          if (!this.drafts[r.key]) this.drafts[r.key] = {};
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load settings.');
        this.loading.set(false);
      },
    });
  }

  save(service: ServiceSetting): void {
    const draft = this.drafts[service.key] ?? {};
    const filled = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v && v.trim().length > 0),
    );
    if (Object.keys(filled).length === 0) {
      return;
    }
    // The backend stores one opaque value per service; serialize the field draft.
    const value = JSON.stringify(filled);
    this.settingsApi.update(service.key, value).subscribe({
      next: (rows) => {
        this.services.set(rows.map((r) => this.toServiceSetting(r)));
        this.drafts[service.key] = {};
        this.savedKey.set(service.key);
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to save settings.'),
    });
  }
}
