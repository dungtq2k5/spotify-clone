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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../auth/decorators';
import { HttpCacheInterceptor } from '../common/interceptors/http-cache.interceptor';
import { Role } from '../generated/prisma/enums';
import {
  CreateTrackDto,
  TopTracksQueryDto,
  TrackQueryDto,
  UpdateTrackDto,
} from './tracks.dto';
import { TracksService } from './tracks.service';

@ApiTags('tracks')
@UseInterceptors(HttpCacheInterceptor)
@Controller('tracks')
export class TracksController {
  constructor(private readonly tracks: TracksService) {}

  @Public()
  @Get()
  findAll(@Query() query: TrackQueryDto) {
    return this.tracks.findAll(query);
  }

  /** Declared before `:id` so "top" is not parsed as an id. */
  @Public()
  @Get('top')
  top(@Query() { limit }: TopTracksQueryDto) {
    return this.tracks.top(limit);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tracks.findOne(id);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Post()
  create(@Body() dto: CreateTrackDto) {
    return this.tracks.create(dto);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTrackDto) {
    return this.tracks.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tracks.remove(id);
  }
}
