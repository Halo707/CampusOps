import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decidePolicy, ToolName } from "@/lib/policy";
import { z } from "zod";

// One call = one tool invocation within a run. The frontend calls this
// once per step in the scripted sequence (or once per model tool-call,
// in a live-LLM deployment), exactly like execTool() does client-side
// in the artifact — the only thing that changed is where the mutation
// and the approval gate live: here, instead of React state.

const bodySchema = z.object({
  runId: z.string(),
  tool: z.string(),
  args: z.record(z.any()),
  reason: z.string(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { runId, tool, args, reason } = parsed.data;

  if (!(tool in decidePolicyToolMap)) {
    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  }

  const policy = decidePolicy(tool as ToolName);
  const startedAt = Date.now();

  // CRITICAL — never auto-executed, always creates a privileged approval request.
  if (policy.action === "deny_auto_requires_privileged") {
    const approval = await prisma.approvalRequest.create({
      data: { runId, tool, args, reason, risk: policy.risk, privileged: true, affected: args.affected ?? "Unknown", status: "PENDING" },
    });
    await prisma.agentAction.create({
      data: { runId, tool, args, reason, risk: policy.risk, approval: "BLOCKED", result: "Denied — requires privileged human authorization", success: false, durationMs: Date.now() - startedAt },
    });
    return NextResponse.json({ status: "blocked", approvalId: approval.id });
  }

  // HIGH / MEDIUM-that-always-needs-approval — pause and wait for a human.
  if (policy.action === "require_approval") {
    const approval = await prisma.approvalRequest.create({
      data: { runId, tool, args, reason, risk: policy.risk, privileged: false, affected: args.affected ?? "—", status: "PENDING" },
    });
    await prisma.agentAction.create({
      data: { runId, tool, args, reason, risk: policy.risk, approval: "PENDING", result: "Awaiting human approval", success: null, durationMs: Date.now() - startedAt },
    });
    return NextResponse.json({ status: "awaiting_approval", approvalId: approval.id });
  }

  // AUTO-EXECUTE — validate args server-side (never trust the client), then run.
  try {
    const result = await executeTool(tool as ToolName, args);
    await prisma.agentAction.create({
      data: { runId, tool, args, reason, risk: policy.risk, approval: "N/A", result: result.summary, success: true, durationMs: Date.now() - startedAt },
    });
    return NextResponse.json({ status: "done", result });
  } catch (err) {
    await prisma.agentAction.create({
      data: { runId, tool, args, reason, risk: policy.risk, approval: "N/A", result: `Tool failed: ${(err as Error).message}`, success: false, durationMs: Date.now() - startedAt },
    });
    return NextResponse.json({ status: "error", error: (err as Error).message }, { status: 500 });
  }
}

const decidePolicyToolMap = {
  get_room_status: 1, get_room_schedule: 1, get_building_status: 1, get_maintenance_history: 1,
  get_incident_history: 1, detect_recurring_issue: 1, get_system_policies: 1, create_maintenance_ticket: 1,
  find_available_room: 1, send_notification: 1, assign_technician: 1, update_maintenance_ticket: 1,
  move_booking: 1, cancel_booking: 1, spend_budget: 1, shutdown_building_power: 1, delete_records: 1,
};

// Only two tools are fully ported here as a worked example — port the rest
// from runToolLogic() in CampusOps.jsx following this exact pattern:
// validate args with zod, then replace array.find/map with the equivalent
// prisma call.
async function executeTool(tool: ToolName, args: any) {
  switch (tool) {
    case "get_room_status": {
      const room = await prisma.room.findUnique({ where: { id: args.roomId } });
      if (!room) throw new Error("Room not found");
      return { summary: `Room ${room.number}: status ${room.status}.`, data: room };
    }
    case "create_maintenance_ticket": {
      const ticket = await prisma.maintenanceTicket.create({
        data: { roomId: args.roomId, issue: args.issue, priority: args.priority.toUpperCase(), status: "OPEN" },
      });
      if (args.priority === "critical" || args.priority === "high") {
        await prisma.room.update({ where: { id: args.roomId }, data: { status: "MAINTENANCE" } });
      }
      return { summary: `Ticket ${ticket.id} created — priority ${args.priority.toUpperCase()}.`, data: ticket };
    }
    default:
      throw new Error(`Tool "${tool}" not yet ported — see runToolLogic() in CampusOps.jsx for the source logic to port.`);
  }
}
