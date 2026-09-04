import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, sessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(sessionCookie.name)?.value;
  const user = token ? verifySessionToken(token) : null;
  const response = NextResponse.json({ data: { user } });
  response.headers.set("Cache-Control", "no-store");
  return response;
}