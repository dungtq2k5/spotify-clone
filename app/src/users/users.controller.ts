import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CurrentUser, Roles } from '../auth/decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { Role } from '../generated/prisma/enums';
import { UsersService } from './users.service';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.users.findById(userId);
  }

  @Get()
  @Roles([Role.ADMIN])
  findAll(@Query() query: PaginationQueryDto) {
    return this.users.findAll(query);
  }

  @Patch(':id/role')
  @Roles([Role.ADMIN])
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.users.updateRole(id, dto.role);
  }
}
