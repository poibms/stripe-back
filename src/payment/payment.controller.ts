import { Body, Controller, HttpCode, Post, Headers, Req } from '@nestjs/common';
import {Request} from 'express';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-customer')
  async createCustomer(@Body() body: { email: string; name: string }) {
    return this.paymentService.createCustomer(body.email, body.name);
  }

  @Post('create-subscription')
  async createSubscription(@Body() body: { customerId: string; priceId: string }) {
    console.log(body.customerId);
    const clientSecret = await this.paymentService.createSubscription(body.customerId, body.priceId)
    return { clientSecret, status: 'incomplete' };
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any, @Headers() headers: Headers, @Req() req: Request ) {
    return this.paymentService.handleStripeWebhook(body, headers, req);
  }
}
