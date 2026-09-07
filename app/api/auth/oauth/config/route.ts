import { NextResponse } from "next/server";
import { configuredProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ data: configuredProviders() });
}