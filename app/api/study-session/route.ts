import { NextRequest } from "next/server";
import { runNodeHandler } from "../../../lib/nodeHandlerAdapter";
const handler = require("../../../api/study-session");

export async function GET(req: NextRequest) {
  return runNodeHandler(handler, req);
}

export async function POST(req: NextRequest) {
  return runNodeHandler(handler, req);
}

export async function OPTIONS(req: NextRequest) {
  return runNodeHandler(handler, req);
}
