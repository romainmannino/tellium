import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = headers();

  const city = decodeURIComponent(
    h.get("x-vercel-ip-city") || "Lyon",
  );

  const countryCode = h.get("x-vercel-ip-country") || "FR";

  const latitude = Number(
    h.get("x-vercel-ip-latitude") || "45.764",
  );

  const longitude = Number(
    h.get("x-vercel-ip-longitude") || "4.8357",
  );

  return NextResponse.json({
    city,
    countryCode,
    latitude,
    longitude,
  });
}
