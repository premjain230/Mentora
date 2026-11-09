import { NextRequest } from "next/server";
import { runNodeHandler } from "../../../lib/nodeHandlerAdapter";
const handler = require("../../../server/growth");

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  return runNodeHandler(handler, req, { route: "feedback" });
}

export async function POST(req: NextRequest) {
  return runNodeHandler(handler, req, { route: "feedback" });
}

export async function PUT(req: NextRequest) {
  return runNodeHandler(handler, req, { route: "feedback" });
}

export async function PATCH(req: NextRequest) {
  return runNodeHandler(handler, req, { route: "feedback" });
}

export async function OPTIONS(req: NextRequest) {
  return runNodeHandler(handler, req, { route: "feedback" });
}
