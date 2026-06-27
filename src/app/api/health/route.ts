import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "rag-lens",
    timestamp: new Date().toISOString(),
  });
}
