import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  approvalId: z.string(),
  decision: z.enum(["approve", "deny"]),
  privilegedConfirmed: z.boolean().optional(),
  reviewerId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { approvalId, decision, privilegedConfirmed, reviewerId } = parsed.data;

  const approval = await prisma.approvalRequest.findUnique({ where: { id: approvalId } });
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  if (approval.status !== "PENDING") return NextResponse.json({ error: "Already resolved" }, { status: 409 });

  // CRITICAL actions require the explicit second confirmation — never skip this server-side,
  // even if a client claims it already showed the confirmation dialog.
  if (approval.privileged && decision === "approve" && !privilegedConfirmed) {
    return NextResponse.json({ error: "Privileged confirmation required" }, { status: 403 });
  }

  await prisma.approvalRequest.update({
    where: { id: approvalId },
    data: { status: decision === "approve" ? "APPROVED" : "DENIED", resolvedAt: new Date(), reviewerId },
  });

  await prisma.agentAction.create({
    data: {
      runId: approval.runId ?? "", tool: approval.tool, args: approval.args as any, reason: approval.reason,
      risk: approval.risk, approval: decision === "approve" ? "APPROVED" : "DENIED",
      result: decision === "approve" ? "Human approved — executing" : "Human denied the action",
      success: decision === "approve", durationMs: 0,
    },
  });

  if (decision === "deny") return NextResponse.json({ status: "denied" });

  // Approved -> actually run the tool now. Import executeTool from the run route's
  // module in your real project instead of duplicating it — split it into
  // lib/tools.ts and import from both routes.
  return NextResponse.json({ status: "approved", note: "Call the same executeTool() used in /api/agent/run here to actually run it." });
}
