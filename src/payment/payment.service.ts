import { Injectable, Logger } from '@nestjs/common';
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";
import { PaymentRepository } from "./payment.repository";
import { Request } from 'express';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private configService: ConfigService, private paymentRepository: PaymentRepository,) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-10-28.acacia',
    });
  }

  async createCustomer(email: string, name: string) {
    const customer = await this.stripe.customers.create({
      email,
      name,
    })
    const user = await this.paymentRepository.createUser(email, name, customer.id);
    return user;
  }

  async createSubscription(customerId: string, priceId: string) {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    const user = await this.paymentRepository.findUserByStripeCustomerId(customerId);

    if (!user) {
      throw new Error('User not found');
    }

    const dbSubscription = await this.paymentRepository.createSubscription(
      user.id,
      subscription.id,
      subscription.status,
      new Date(subscription.current_period_end * 1000),
    );
    const {client_secret}  = (subscription.latest_invoice as Stripe.Invoice).payment_intent as Stripe.PaymentIntent
    return client_secret
  }

  async handleStripeWebhook(body: string | Buffer, headers: Headers, req: Request) {

    const signature = req.headers['stripe-signature'];
    const secret = this.configService.get('STRIPE_SECRET_ENDPOINT');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        signature,
        secret
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      throw new Error('Webhook signature verification failed')
    }

    return await this.handleHookEvent(event)
  }


  private async handleHookEvent(event: Stripe.Event): Promise<{received: boolean}> {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        const paymentSucceeded = event.data.object as Stripe.Invoice;
        Logger.log(`Payment for invoice ${paymentSucceeded.id} succeeded.`);
        await this.paymentRepository.updatePaymentStatus(paymentSucceeded.id, 'succeeded');
        break;

      case 'invoice.payment_failed':
        const paymentFailed = event.data.object as Stripe.Invoice;
        Logger.log(`Payment for invoice ${paymentFailed.id} failed.`);
        await this.paymentRepository.updatePaymentStatus(paymentFailed.id, 'failed');
        break;

      case 'customer.subscription.created':
        const subscriptionCreated = event.data.object as Stripe.Subscription;
        Logger.log(`Subscription ${event.type} ${subscriptionCreated.id} created.`);
        await this.paymentRepository.createSubscriptionRecord(subscriptionCreated);
        break;

      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object as Stripe.Subscription;
        Logger.log(`Subscription ${subscriptionUpdated.id} updated.`);
        await this.paymentRepository.updateSubscriptionRecord(subscriptionUpdated);
        break;

      case 'payment_intent.created':
        const paymentIntentCreated = event.data.object as Stripe.PaymentIntent;
        Logger.log(`Payment intent ${paymentIntentCreated.id} created.`);
        break;

      case 'invoice.created':
        const invoiceCreated = event.data.object as Stripe.Invoice;
        Logger.log(`Invoice ${invoiceCreated.id} created.`);
        break;

      case 'invoice.finalized':
        const invoiceFinalized = event.data.object as Stripe.Invoice;
        Logger.log(`Invoice ${invoiceFinalized.id} finalized.`);
        break;


      default:
        Logger.warn(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }
}
