import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ShiftStatus } from '../entities/shift.entity';

export class AdminShiftQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) staffId?: number;
  @IsOptional() @IsEnum(ShiftStatus) status?: ShiftStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class ForceCloseShiftDto {
  @Type(() => Number) @Min(0) actualCash: number;
  @IsString() @MinLength(3) @MaxLength(255) reason: string;
}
