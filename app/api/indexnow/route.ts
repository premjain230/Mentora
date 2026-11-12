import { NextResponse } from "next/server";

const INDEXNOW_KEY = "d7e891c94b7e4f169cb4812f8649ab01";
const HOST = "www.learningallied.world";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const ALL_PUBLIC_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/best-ai-study-tools`,
  `https://${HOST}/best-study-tools`,
  `https://${HOST}/learning-allied-vs-chatgpt`,
  `https://${HOST}/ai-study-tools-india`,
  `https://${HOST}/jee-preparation`,
  `https://${HOST}/neet-preparation`,
  `https://${HOST}/cbse-board`,
  `https://${HOST}/maharashtra-board`,
  `https://${HOST}/best-jee-preparation-tools`,
  `https://${HOST}/best-neet-preparation-tools`,
  `https://${HOST}/study-tools-cbse`,
  `https://${HOST}/study-tools-maharashtra-board`,
  `https://${HOST}/ai-study-assistant`,
  `https://${HOST}/best-ai-learning-platforms`,
  `https://${HOST}/learn-smarter-with-ai`,
  `https://${HOST}/how-it-works`,
  `https://${HOST}/blog`,
  `https://${HOST}/blog/how-to-make-a-jee-study-plan`,
  `https://${HOST}/blog/how-to-study-smarter-using-ai`,
  `https://${HOST}/blog/active-recall-spaced-repetition-guide`,
  `https://${HOST}/blog/cbse-class-12-board-study-strategy`,
  `https://${HOST}/about`,
  `https://${HOST}/founder`,
  `https://${HOST}/changelog`,
  `https://${HOST}/press`,
  `https://${HOST}/privacy-policy`,
  `https://${HOST}/terms-of-use`,
];

export async function POST(request: Request) {
  try {
    let urlList = ALL_PUBLIC_URLS;
    try {
      const body = await request.json();
      if (Array.isArray(body?.urls) && body.urls.length > 0) {
        urlList = body.urls;
      }
    } catch {
      // Use default full public URL list
    }

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    };

    // IndexNow API endpoints (Bing & IndexNow central)
    const endpoints = [
      "https://api.indexnow.org/indexnow",
      "https://www.bing.com/indexnow",
    ];

    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(payload),
          });
          return { endpoint, status: res.status, ok: res.ok };
        } catch (err: any) {
          return { endpoint, status: 0, error: err?.message || "Failed" };
        }
      })
    );

    return NextResponse.json({
      success: true,
      message: `Submitted ${urlList.length} URLs to IndexNow protocol.`,
      keyLocation: KEY_LOCATION,
      submittedUrlsCount: urlList.length,
      endpoints: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    protocol: "IndexNow",
    host: HOST,
    keyLocation: KEY_LOCATION,
    totalIndexedUrlsAvailable: ALL_PUBLIC_URLS.length,
    instructions: "Send a POST request to this endpoint to trigger instant submission of all canonical URLs to Bing and IndexNow.",
  });
}
