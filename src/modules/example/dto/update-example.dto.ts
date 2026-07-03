import { PartialType } from '@nestjs/swagger';
import { CreateExampleDto } from './create-example.dto';

/** Every field of CreateExampleDto, made optional — the body for a partial update. */
export class UpdateExampleDto extends PartialType(CreateExampleDto) {}
