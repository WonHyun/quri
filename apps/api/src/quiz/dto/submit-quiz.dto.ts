import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { MAX_CHOICE_COUNT } from "@quri/agent";

export class AnswerDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(MAX_CHOICE_COUNT - 1)
  selectedIndex!: number;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
