import { UserRole } from "../models/User.js";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: UserRole;
      email: string;
      name: string;
    }

    interface Request {
      user?: User;
    }
  }
}
