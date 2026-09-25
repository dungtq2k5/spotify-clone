import { Role } from '../generated/prisma/enums';

/** What the JwtAuthGuard puts on `request.user`. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
