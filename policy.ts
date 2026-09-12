// Same registry as CampusOps.jsx's TOOLS/decidePolicy — kept identical on
// purpose so the risk rules never drift between prototype and production.

export const TOOLS = {
  get_room_status: { risk: "LOW" as const },
  get_room_schedule: { risk: "LOW" as const },
  get_building_status: { risk: "LOW" as const },
  get_maintenance_history: { risk: "LOW" as const },
  get_incident_history: { risk: "LOW" as const },
  detect_recurring_issue: { risk: "LOW" as const },
  get_system_policies: { risk: "LOW" as const },
  create_maintenance_ticket: { risk: "LOW" as const },
  find_available_room: { risk: "LOW" as const },
  send_notification: { risk: "LOW" as const },
  assign_technician: { risk: "MEDIUM" as const },
  update_maintenance_ticket: { risk: "MEDIUM" as const },
  move_booking: { risk: "MEDIUM" as const, alwaysApprove: true },
  cancel_booking: { risk: "HIGH" as const },
  spend_budget: { risk: "HIGH" as const },
  shutdown_building_power: { risk: "CRITICAL" as const, neverAuto: true },
  delete_records: { risk: "CRITICAL" as const, neverAuto: true },
} as const;

export type ToolName = keyof typeof TOOLS;

export function decidePolicy(toolName: ToolName) {
  const t = TOOLS[toolName];
  if ("neverAuto" in t && t.neverAuto) return { action: "deny_auto_requires_privileged" as const, risk: t.risk };
  if (t.risk === "HIGH") return { action: "require_approval" as const, risk: t.risk };
  if (t.risk === "MEDIUM") return { action: ("alwaysApprove" in t && t.alwaysApprove) ? "require_approval" as const : "auto" as const, risk: t.risk };
  return { action: "auto" as const, risk: t.risk };
}
