import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { LibraryService } from './library.service';

/** Per-user interactions with the catalog. Not cached: responses are user-specific. */
@ApiTags('library')
@ApiBearerAuth()
@Controller()
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('me/likes')
  likedTracks(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.library.likedTracks(userId, query);
  }

  @Put('tracks/:id/like')
  @HttpCode(204)
  like(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.library.like(userId, id);
  }

  @Delete('tracks/:id/like')
  @HttpCode(204)
  unlike(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.library.unlike(userId, id);
  }

  /** Counts a play. Limited per user to stop play-count inflation. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('tracks/:id/play')
  @HttpCode(200)
  play(@Param('id', ParseUUIDPipe) id: string) {
    return this.library.play(id);
  }
}
