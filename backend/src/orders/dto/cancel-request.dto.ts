import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
export class CancelRequestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason: string;
}

export class CancelOrderDto extends CancelRequestDto {}

export class RejectCancelDto extends CancelRequestDto {}
