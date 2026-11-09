import { NextRequest } from "next/server";
import { runNodeHandler } from "../../../../lib/nodeHandlerAdapter";
const handler = require("../../../../server/growth");

export const maxDuration = 30;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return runNodeHandler(handler, req, { route: `feedback/${params.id}` });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return runNodeHandler(handler, req, { route: `feedback/${params.id}` });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return runNodeHandler(handler, req, { route: `feedback/${params.id}` });
}

export async function OPTIONS(req: NextRequest, { params }: { params: { id: string } }) {
  return runNodeHandler(handler, req, { route: `feedback/${params.id}` });
}
