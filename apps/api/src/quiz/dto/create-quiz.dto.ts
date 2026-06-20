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
  EXAM_PRESET_SLUGS,
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

  /** 시험 프리셋 식별자 (선택). 주어지면 출제 지침이 프롬프트에 주입된다. */
  @IsOptional()
  @IsIn([...EXAM_PRESET_SLUGS])
  presetSlug?: string;

  /** 프리셋 내 과목/영역으로 출제 범위를 좁힘 (선택). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;
}
