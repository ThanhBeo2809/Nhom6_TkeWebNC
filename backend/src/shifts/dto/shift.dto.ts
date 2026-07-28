import { IsNumber, Min } from 'class-validator';
export class StartShiftDto {
  @IsNumber() @Min(0) openingCash: number;
}
export class EndShiftDto {
  @IsNumber() @Min(0) actualCash: number;
}
