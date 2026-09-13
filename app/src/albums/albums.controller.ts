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
import { AlbumQueryDto, CreateAlbumDto, UpdateAlbumDto } from './albums.dto';
import { AlbumsService } from './albums.service';

@ApiTags('albums')
@UseInterceptors(HttpCacheInterceptor)
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Public()
  @Get()
  findAll(@Query() query: AlbumQueryDto) {
    return this.albums.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.albums.findOne(id);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Post()
  create(@Body() dto: CreateAlbumDto) {
    return this.albums.create(dto);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAlbumDto) {
    return this.albums.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.albums.remove(id);
  }
}
