import { NextRequest } from "next/server";
import { runNodeHandler } from "../../../../lib/nodeHandlerAdapter";
const handler = require("../../../../server/admin-entitlements");

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  return runNodeHandler(handler, req);
}

export async function OPTIONS(req: NextRequest) {
  return runNodeHandler(handler, req);
}
