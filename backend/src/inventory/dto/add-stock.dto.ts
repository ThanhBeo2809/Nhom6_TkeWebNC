import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AddStockDto {
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
