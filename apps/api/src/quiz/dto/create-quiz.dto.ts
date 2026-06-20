import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  MinLength,
  IsIn,
} from "class-validator";
import {
  DIFFICULTIES,
  Difficulty,
  MAX_CHOICE_COUNT,
  MIN_CHOICE_COUNT,
} from "@quri/agent";

export class CreateQuizDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  topic!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;

  @IsOptional()
  @IsInt()
  @Min(MIN_CHOICE_COUNT)
  @Max(MAX_CHOICE_COUNT)
  choiceCount?: number;

  @IsOptional()
  @IsIn([...DIFFICULTIES])
  difficulty?: Difficulty;
}
