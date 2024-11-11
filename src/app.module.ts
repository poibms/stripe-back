import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import { PaymentService } from './payment/payment.service';
import { PaymentController } from './payment/payment.controller';
import { PrismaService } from "./prisma/prisma.service";
import { PaymentRepository } from "./payment/payment.repository";
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { UserRepository } from './user/user.repository';

@Module({
  imports: [
    ConfigModule.forRoot()
  ],
  controllers: [AppController, PaymentController, UserController],
  providers: [AppService, PaymentService, PrismaService, PaymentRepository, UserService, UserRepository],
})
export class AppModule {}
