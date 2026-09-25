import { Module } from '@nestjs/common';
import { PlaylistOwnerGuard } from './playlist-owner.guard';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';

@Module({
  controllers: [PlaylistsController],
  providers: [PlaylistsService, PlaylistOwnerGuard],
})
export class PlaylistsModule {}
