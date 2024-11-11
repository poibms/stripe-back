import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentRepository {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, name: string, stripeCustomerId: string) {
    return this.prisma.user.create({
      data: {
        email,
        name,
        stripeCustomerId,
      },
    });
  }

  async findUserByStripeCustomerId(stripeCustomerId: string) {
    return this.prisma.user.findUnique({
      where: { stripeCustomerId },
    });
  }

  async createSubscription(userId: number, stripeSubscriptionId: string, status: string, currentPeriodEnd: Date) {
    return this.prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId,
        status,
        currentPeriodEnd,
      },
    });
  }

  async updatePaymentStatus(invoiceId: string, status: string) {
    return this.prisma.payment.updateMany({
      where: { stripeInvoiceId: invoiceId },
      data: { status },
    });
  }

  async createSubscriptionRecord(subscription: Stripe.Subscription) {

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (existingSubscription) {
      return existingSubscription;
    }

    return this.prisma.subscription.create({
      data: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        user: {
          connect: { stripeCustomerId: subscription.customer as string },
        },
      },
    });
  }

  async updateSubscriptionRecord(subscription: Stripe.Subscription) {
    return this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

}
