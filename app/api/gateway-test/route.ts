import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiGatewayUrl = process.env.API_GATEWAY_URL;

  if (!apiGatewayUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing API_GATEWAY_URL in environment variables",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${apiGatewayUrl}/health`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const contentType = response.headers.get("content-type") ?? "";

    const gatewayResponse = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        source: "next-route-handler",
        gatewayUrl: `${apiGatewayUrl}/health`,
        gatewayResponse,
      },
      {
        status: response.ok ? 200 : 502,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "next-route-handler",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}