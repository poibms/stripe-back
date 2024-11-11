import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {

  constructor(private readonly userRepository: UserRepository) {}

  async getUsers() {
    const user = await this.userRepository.getUsers();
    return user;
  }

}
