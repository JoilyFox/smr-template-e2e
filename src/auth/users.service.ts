import { Injectable } from '@nestjs/common';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  private readonly users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const id = Math.random().toString(36).substring(2, 15);
    const newUser: User = {
      id,
      email,
      passwordHash,
    };
    this.users.set(id, newUser);
    return newUser;
  }
}
