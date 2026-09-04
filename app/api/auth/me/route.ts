import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, sessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(sessionCookie.name)?.value;
  if (!token) {
    return NextResponse.json({ data: { user: null } });
  }
  const user = verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ data: { user: null } });
  }
  return NextResponse.json({ data: { user } });
}