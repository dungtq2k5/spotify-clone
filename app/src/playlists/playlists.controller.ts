import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser, Public } from '../auth/decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PlaylistOwnerGuard } from './playlist-owner.guard';
import {
  AddTrackDto,
  CreatePlaylistDto,
  ReorderTracksDto,
  UpdatePlaylistDto,
} from './playlists.dto';
import { PlaylistsService } from './playlists.service';

@ApiTags('playlists')
@ApiBearerAuth()
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Public()
  @Get()
  findPublic(@Query() query: PaginationQueryDto) {
    return this.playlists.findAll(query);
  }

  @Get('mine')
  findMine(
    @Query() query: PaginationQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.playlists.findAll(query, userId);
  }

  /** Public route; a token (if sent) unlocks the caller's private playlists. */
  @Public()
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.playlists.findOne(id, user);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePlaylistDto) {
    return this.playlists.create(userId, dto);
  }

  @UseGuards(PlaylistOwnerGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlaylistDto) {
    return this.playlists.update(id, dto);
  }

  @UseGuards(PlaylistOwnerGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.playlists.remove(id);
  }

  @UseGuards(PlaylistOwnerGuard)
  @Post(':id/tracks')
  addTrack(@Param('id') id: string, @Body() dto: AddTrackDto) {
    return this.playlists.addTrack(id, dto.trackId);
  }

  @UseGuards(PlaylistOwnerGuard)
  @Delete(':id/tracks/:trackId')
  @HttpCode(204)
  removeTrack(
    @Param('id') id: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ) {
    return this.playlists.removeTrack(id, trackId);
  }

  @UseGuards(PlaylistOwnerGuard)
  @Put(':id/tracks/order')
  reorder(@Param('id') id: string, @Body() dto: ReorderTracksDto) {
    return this.playlists.reorder(id, dto.trackIds);
  }
}
