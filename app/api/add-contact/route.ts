import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name } = body || {};

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, message: "Brevo API key not configured (skipped)" });
    }

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        attributes: {
          FIRSTNAME: name || "Student",
        },
        listIds: [3],
        updateEnabled: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ success: true, message: "Added to Brevo" });
  } catch (error: any) {
    console.error("Add contact error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
