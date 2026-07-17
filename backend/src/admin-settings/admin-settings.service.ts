import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

interface ServiceDescriptor {
  key: string;
  label: string;
  description: string;
  /** Env var whose presence marks the service configured by default. */
  envKey: string;
}

const SERVICES: ServiceDescriptor[] = [
  {
    key: 'postgresql',
    label: 'PostgreSQL',
    description: 'Primary application database connection.',
    envKey: 'DATABASE_URL',
  },
  {
    key: 'minio',
    label: 'MinIO object storage',
    description: 'Optional S3-compatible storage for tool photos.',
    envKey: 'MINIO_ENDPOINT',
  },
];

/** Never return secrets in cleartext — collapse any value to a fixed mask. */
function mask(value: string | undefined | null): string {
  if (!value) return '';
  return '•••••••• (configured)';
}

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * List service settings with a masked value and configured flag. A service is
   * configured when either an env var is present (deploy-time) or an admin has
   * stored a SystemSetting row (priority: DB override → env).
   */
  async list() {
    const rows = await this.prisma.systemSetting.findMany();
    const dbMap = new Map(rows.map((r) => [r.key, r]));

    return SERVICES.map((svc) => {
      const dbRow = dbMap.get(svc.key);
      const envVal = process.env[svc.envKey];
      const effective = dbRow?.value || envVal || null;
      return {
        key: svc.key,
        label: svc.label,
        description: svc.description,
        configured: !!effective,
        maskedValue: mask(effective),
        source: dbRow?.value ? 'db' : envVal ? 'env' : null,
        updatedAt: dbRow?.updatedAt ?? null,
      };
    });
  }

  /** Upsert a single service setting (single row per key, updatedAt bumped). */
  async update(dto: UpdateSettingDto) {
    await this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value },
      create: { key: dto.key, value: dto.value },
    });
    return this.list();
  }
}
