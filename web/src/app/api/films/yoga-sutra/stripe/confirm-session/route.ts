import { NextRequest, NextResponse } from "next/server";
import { fulfillFilmStripeSession } from "@/lib/film-stripe";
import { YOGA_SUTRA_FILM_ID } from "@/lib/films/yoga-sutra";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const result = await fulfillFilmStripeSession(session);

    if (!result.unlocked) {
      return NextResponse.json({
        unlocked: false,
        status: session.payment_status,
      });
    }

    return NextResponse.json({
      unlocked: true,
      alreadyUnlocked: result.alreadyUnlocked ?? false,
      accessToken: result.accessToken,
      filmId: YOGA_SUTRA_FILM_ID,
    });
  } catch (e) {
    console.error("film stripe confirm-session error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Confirmation failed" },
      { status: 500 }
    );
  }
}
