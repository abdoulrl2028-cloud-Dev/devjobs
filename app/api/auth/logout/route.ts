import { NextRequest, NextResponse } from "next/server";
import { sessionCookie, isSameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }
  const response = NextResponse.json({ data: { message: "Logout realizado" } });
  response.cookies.set(sessionCookie.name, "", sessionCookie.options(0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}