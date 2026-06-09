import { db, escrows } from "@mahara/db";
import { EscrowStateMachine } from "@mahara/payments";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const machine = new EscrowStateMachine(db);

/**
 * Dev payment callback — simulates the CMI/HPS gateway redirect.
 * In production this is replaced by a signed webhook from the payment provider.
 *
 * GET /api/payments/callback?ref=<escrowId>&status=success|failed
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ref = searchParams.get("ref");
  const status = searchParams.get("status");

  if (!ref || status !== "success") {
    return NextResponse.redirect(new URL("/dashboard?payment=failed", req.url));
  }

  try {
    const escrow = await db.query.escrows.findFirst({
      where: eq(escrows.id, ref),
    });
    if (!escrow) {
      return NextResponse.redirect(new URL("/dashboard?payment=not_found", req.url));
    }
    if (escrow.status !== "pending") {
      // Already processed (idempotent — redirect as if success)
      return NextResponse.redirect(new URL("/business/dashboard?payment=funded", req.url));
    }

    // Fund the escrow — system actor (no user session in webhook context)
    await machine.fund(ref, "system");

    return NextResponse.redirect(new URL("/business/dashboard?payment=funded", req.url));
  } catch (err) {
    console.error("[payments/callback] fund error:", err);
    return NextResponse.redirect(new URL("/dashboard?payment=error", req.url));
  }
}
