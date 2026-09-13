import { PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export class CreateAlbumDto {
  /** @example Discovery */
  @IsString()
  @Length(1, 200)
  title: string;

  @IsUUID()
  artistId: string;

  /** @example 2001-03-12 */
  @IsOptional()
  @IsDateString({ strict: true })
  releaseDate?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;
}

export class UpdateAlbumDto extends PartialType(CreateAlbumDto) {}

export class AlbumQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;
}
