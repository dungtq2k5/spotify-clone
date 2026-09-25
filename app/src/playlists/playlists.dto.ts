import { PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreatePlaylistDto {
  /** @example Late Night Coding */
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Private playlists are visible to the owner and admins only. */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdatePlaylistDto extends PartialType(CreatePlaylistDto) {}

export class AddTrackDto {
  @IsUUID()
  trackId: string;
}

export class ReorderTracksDto {
  /** Every track id currently in the playlist, in the new order. */
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  trackIds: string[];
}
