import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceSetting } from '../../models/toolshare.models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
})
export class AdminSettingsComponent {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedKey = signal<string | null>(null);

  // Backend-provided data — signal per the mockup data contract.
  readonly services = signal<ServiceSetting[]>([
    {
      key: 'postgresql',
      label: 'PostgreSQL',
      description: 'Primary application database connection.',
      configured: true,
      maskedValue: 'postgres://••••••@db:5432/toolshare',
      fields: [
        { name: 'host', label: 'Host', type: 'text', placeholder: 'db.internal' },
        { name: 'database', label: 'Database', type: 'text', placeholder: 'toolshare' },
        { name: 'user', label: 'User', type: 'text', placeholder: 'toolshare_app' },
        { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
      ],
    },
    {
      key: 'minio',
      label: 'MinIO object storage',
      description: 'Optional S3-compatible storage for tool photos.',
      configured: false,
      maskedValue: '',
      fields: [
        { name: 'endpoint', label: 'Endpoint', type: 'text', placeholder: 'minio.internal:9000' },
        { name: 'accessKey', label: 'Access key', type: 'text', placeholder: 'AKIA…' },
        { name: 'secretKey', label: 'Secret key', type: 'password', placeholder: '••••••••' },
        { name: 'bucket', label: 'Bucket', type: 'text', placeholder: 'toolshare-media' },
      ],
    },
  ]);

  // Editable drafts keyed by service.key -> field.name.
  readonly drafts: Record<string, Record<string, string>> = {
    postgresql: {},
    minio: {},
  };

  save(service: ServiceSetting): void {
    const draft = this.drafts[service.key] ?? {};
    const filled = Object.values(draft).some((v) => v && v.trim().length > 0);
    this.services.update((list) =>
      list.map((s) =>
        s.key === service.key
          ? { ...s, configured: filled || s.configured, maskedValue: filled ? '•••••••• (updated)' : s.maskedValue }
          : s,
      ),
    );
    this.savedKey.set(service.key);
  }
}
