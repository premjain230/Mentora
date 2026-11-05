import { NextRequest, NextResponse } from "next/server";

export async function runNodeHandler(
  handler: any,
  req: NextRequest,
  queryParams: Record<string, string> = {}
): Promise<NextResponse> {
  let body: any = null;
  const contentType = req.headers.get("content-type") || "";
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    try {
      if (contentType.includes("application/json")) {
        body = await req.json();
      } else {
        body = await req.text();
      }
    } catch {
      body = {};
    }
  }

  return new Promise<NextResponse>(async (resolve) => {
    let statusCode = 200;
    const responseHeaders = new Headers();
    let isResolved = false;
    let headersSent = false;
    let streamWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;

    const mockRes: any = {
      statusCode: 200,
      get headersSent() {
        return headersSent || isResolved;
      },
      setHeader(name: string, value: string) {
        responseHeaders.set(name, value);
        return this;
      },
      getHeader(name: string) {
        return responseHeaders.get(name);
      },
      status(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      write(chunk: any) {
        if (!streamWriter) {
          headersSent = true;
          isResolved = true;
          const { readable, writable } = new TransformStream();
          streamWriter = writable.getWriter();
          resolve(new NextResponse(readable, { status: statusCode, headers: responseHeaders }));
        }
        const encoded = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
        streamWriter.write(encoded);
        return true;
      },
      json(data: any) {
        if (isResolved) return;
        headersSent = true;
        isResolved = true;
        responseHeaders.set("Content-Type", "application/json");
        resolve(NextResponse.json(data, { status: statusCode, headers: responseHeaders }));
      },
      send(data: any) {
        if (isResolved) return;
        headersSent = true;
        isResolved = true;
        resolve(new NextResponse(data, { status: statusCode, headers: responseHeaders }));
      },
      end(data?: any) {
        if (streamWriter) {
          if (data) {
            const encoded = typeof data === "string" ? new TextEncoder().encode(data) : data;
            streamWriter.write(encoded);
          }
          streamWriter.close();
          return;
        }
        if (isResolved) return;
        headersSent = true;
        isResolved = true;
        resolve(new NextResponse(data || null, { status: statusCode, headers: responseHeaders }));
      },
    };

    const url = new URL(req.url);
    const query: Record<string, any> = { ...queryParams };
    url.searchParams.forEach((val, key) => {
      query[key] = val;
    });

    const mockReq: any = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      query,
      body,
      socket: { remoteAddress: req.ip || "127.0.0.1" },
      on(event: string, callback: any) {
        if (event === "data" && body) {
          callback(typeof body === "string" ? body : JSON.stringify(body));
        }
        if (event === "end") {
          callback();
        }
        return this;
      },
    };

    try {
      const fn = handler.default || handler;
      await fn(mockReq, mockRes);
    } catch (err: any) {
      console.error("Route execution error:", err);
      if (!isResolved) {
        isResolved = true;
        resolve(
          NextResponse.json(
            { error: err?.message || "Internal server error" },
            { status: 500 }
          )
        );
      }
    }
  });
}
