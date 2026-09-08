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
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { HttpCacheInterceptor } from '../common/interceptors/http-cache.interceptor';
import { Role } from '../generated/prisma/enums';
import { CreateArtistDto, UpdateArtistDto } from './artists.dto';
import { ArtistsService } from './artists.service';

@ApiTags('artists')
@UseInterceptors(HttpCacheInterceptor)
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Public()
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.artists.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.artists.findOne(id);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Post()
  create(@Body() dto: CreateArtistDto) {
    return this.artists.create(dto);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArtistDto) {
    return this.artists.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles([Role.ADMIN])
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.artists.remove(id);
  }
}
