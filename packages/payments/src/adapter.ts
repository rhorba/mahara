import type { Money } from "@mahara/core/types";

export type GatewaySession = {
  sessionId: string;
  redirectUrl: string;
  ref: string;
};

export type GatewayEventType =
  | "payment.success"
  | "payment.failed"
  | "payout.success"
  | "payout.failed";

export type GatewayEvent = {
  type: GatewayEventType;
  ref: string;
  amount: Money;
};

export type PayoutMethod = "bank_transfer" | "cashplus" | "wafacash";

export type BankDetails = {
  accountName: string;
  method: PayoutMethod;
  rib?: string; // for bank_transfer
  phone?: string; // for cashplus / wafacash
};

export type PayoutRef = {
  ref: string;
  estimatedArrival?: Date;
};

export interface PaymentGateway {
  initiateCharge(amount: Money, ref: string, returnUrl: string): Promise<GatewaySession>;
  verifyWebhook(payload: unknown, signature: string): GatewayEvent;
  initiatePayout(amount: Money, bankDetails: BankDetails, ref: string): Promise<PayoutRef>;
}

/**
 * DevGateway — always succeeds instantly. Used in development and CI.
 * The redirect URL points to a local callback route that auto-confirms the charge.
 */
export class DevGateway implements PaymentGateway {
  async initiateCharge(_amount: Money, ref: string, _returnUrl: string): Promise<GatewaySession> {
    return {
      sessionId: `dev_sess_${ref}`,
      redirectUrl: `/api/payments/dev-callback?ref=${encodeURIComponent(ref)}&status=success`,
      ref,
    };
  }

  verifyWebhook(payload: unknown, _signature: string): GatewayEvent {
    const body = payload as { ref: string; amount: number; type?: string };
    return {
      type: (body.type as GatewayEventType) ?? "payment.success",
      ref: body.ref,
      amount: body.amount as Money,
    };
  }

  async initiatePayout(_amount: Money, _bankDetails: BankDetails, ref: string): Promise<PayoutRef> {
    return {
      ref: `dev_payout_${ref}`,
      estimatedArrival: new Date(Date.now() + 500),
    };
  }
}
