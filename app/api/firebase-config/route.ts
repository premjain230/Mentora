import { NextRequest } from "next/server";
import { runNodeHandler } from "../../../lib/nodeHandlerAdapter";
const handler = require("../../../api/firebase-config");

export async function GET(req: NextRequest) {
  return runNodeHandler(handler, req);
}

export async function OPTIONS(req: NextRequest) {
  return runNodeHandler(handler, req);
}
