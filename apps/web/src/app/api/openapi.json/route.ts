import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/trpc/openapi";

export function GET() {
  return NextResponse.json(openApiDocument);
}
