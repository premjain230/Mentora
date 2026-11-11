import { NextRequest } from "next/server";
import { runNodeHandler } from "../../../lib/nodeHandlerAdapter";
const { liveTokenHandler } = require("../../../server/live-token");

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  return runNodeHandler(liveTokenHandler, req);
}

export async function OPTIONS(req: NextRequest) {
  return runNodeHandler(liveTokenHandler, req);
}
