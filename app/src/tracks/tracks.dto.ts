import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export class CreateTrackDto {
  /** @example One More Time */
  @IsString()
  @Length(1, 200)
  title: string;

  /** Length in seconds. @example 320 */
  @IsInt()
  @Min(1)
  @Max(3600)
  durationSec: number;

  /** @example https://cdn.example.com/audio/one-more-time.mp3 */
  @IsUrl()
  audioUrl: string;

  @IsUUID()
  artistId: string;

  @IsOptional()
  @IsUUID()
  albumId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  trackNumber?: number;
}

export class UpdateTrackDto extends PartialType(CreateTrackDto) {}

export class TrackQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @IsOptional()
  @IsUUID()
  albumId?: string;
}

export class TopTracksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
