import { getDb } from "../../../db";
import { subscribers } from "../../../db/schema";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";

    if (!emailPattern.test(email) || email.length > 254) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await getDb().insert(subscribers).values({ email }).onConflictDoNothing();
    return Response.json({ subscribed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to subscribe.";
    return Response.json({ error: message }, { status: 500 });
  }
}
