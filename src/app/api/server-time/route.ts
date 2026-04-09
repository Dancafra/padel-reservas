import { NextResponse } from "next/server";

export async function GET() {
  // Devolver tiempo UTC absoluto. El cliente lo usa como referencia confiable.
  const nowUTC = new Date();
  const qrReadable = nowUTC.toLocaleString("es-MX", {
    timeZone: "America/Cancun",
  });

  return NextResponse.json({
    utc: nowUTC.toISOString(),
    utcMs: nowUTC.getTime(),
    qrReadable,
  });
}
