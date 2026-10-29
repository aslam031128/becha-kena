import { UserRole } from '../constants/enums.js';

export interface RequestUser {
  userId: string;
  phone?: string;
  role: UserRole | string;
  isNidVerified: boolean;
  isFrozen: boolean;
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
