import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ data: { message: "Logout realizado" } });
  response.cookies.set(sessionCookie.name, "", sessionCookie.options(0));
  return response;
}