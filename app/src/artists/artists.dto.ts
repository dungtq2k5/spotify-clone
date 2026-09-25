import { PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateArtistDto {
  /** @example Daft Punk */
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
