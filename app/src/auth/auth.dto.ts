import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  /** @example listener@example.com */
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  /** 8-72 chars. @example Password123! */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  /** @example Jane Listener */
  @IsString()
  @Length(1, 50)
  displayName: string;
}

export class LoginDto {
  /** @example user@spotify.local */
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  /** @example User123! */
  @IsString()
  @MaxLength(72)
  password: string;
}

export class RefreshTokenDto {
  /** Opaque refresh token returned by login/refresh. */
  @IsString()
  @MaxLength(200)
  refreshToken: string;
}
