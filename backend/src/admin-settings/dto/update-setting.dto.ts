import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const SUPPORTED_SETTING_KEYS = ['postgresql', 'minio'] as const;
export type SettingKey = (typeof SUPPORTED_SETTING_KEYS)[number];

export class UpdateSettingDto {
  @ApiProperty({ enum: SUPPORTED_SETTING_KEYS, description: 'Service key to configure' })
  @IsString()
  @IsIn([...SUPPORTED_SETTING_KEYS], {
    message: 'key must be one of postgresql, minio',
  })
  key: SettingKey;

  @ApiProperty({ description: 'Value to store (stored server-side, never returned in cleartext)' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
