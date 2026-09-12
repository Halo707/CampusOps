import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, AlertTriangle, Bot, Building2, Wrench, ShieldCheck,
  BarChart3, ScrollText, Send, Play, RotateCcw, XCircle, CheckCircle2,
  Clock, Zap, Users, TrendingUp, TrendingDown, MapPin, Thermometer,
  Wifi, Projector, Power, Lock, ChevronRight, Activity, AlertCircle,
  CircleDot, Loader2, ShieldAlert, BadgeCheck, BellRing, History,
  Gauge, ClipboardList, UserCog, ArrowRight, Sparkles
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const RISK_STYLES = {
  LOW:      { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  MEDIUM:   { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   dot: "bg-amber-400" },
  HIGH:     { text: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  dot: "bg-orange-400" },
  CRITICAL: { text: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    dot: "bg-rose-400" },
};

const STATUS_STYLES = {
  AVAILABLE:   { text: "text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/40" },
  OCCUPIED:    { text: "text-sky-400",     bg: "bg-sky-500/15",     ring: "ring-sky-500/40" },
  MAINTENANCE: { text: "text-amber-400",   bg: "bg-amber-500/15",   ring: "ring-amber-500/40" },
  CRITICAL:    { text: "text-rose-400",    bg: "bg-rose-500/15",    ring: "ring-rose-500/40" },
  RESERVED:    { text: "text-violet-400",  bg: "bg-violet-500/15",  ring: "ring-violet-500/40" },
};

const SEV_STYLES = {
  low: RISK_STYLES.LOW, medium: RISK_STYLES.MEDIUM, high: RISK_STYLES.HIGH, critical: RISK_STYLES.CRITICAL,
};

// ---------------------------------------------------------------------------
// SEED DATA
// ---------------------------------------------------------------------------
function makeSeed() {
  const buildings = [
    { id: "bt", name: "Tech Tower", floors: 6 },
    { id: "sjt", name: "SJT", floors: 5 },
    { id: "ab1", name: "AB1", floors: 4 },
    { id: "ab2", name: "AB2", floors: 4 },
    { id: "lib", name: "Library", floors: 3 },
    { id: "mb", name: "Main Block", floors: 4 },
  ];

  const rooms = [
    { id: "sjt-304", buildingId: "sjt", number: "304", capacity: 60, hasAC: true, hasProjector: true, status: "OCCUPIED" },
    { id: "sjt-401", buildingId: "sjt", number: "401", capacity: 55, hasAC: true, hasProjector: true, status: "AVAILABLE" },
    { id: "sjt-101", buildingId: "sjt", number: "101", capacity: 90, hasAC: true, hasProjector: true, status: "AVAILABLE" },
    { id: "sjt-203", buildingId: "sjt", number: "203", capacity: 40, hasAC: false, hasProjector: true, status: "AVAILABLE" },
    { id: "ab2-203", buildingId: "ab2", number: "203", capacity: 45, hasAC: true, hasProjector: true, status: "OCCUPIED" },
    { id: "ab2-210", buildingId: "ab2", number: "210", capacity: 45, hasAC: true, hasProjector: true, status: "AVAILABLE" },
    { id: "ab2-105", buildingId: "ab2", number: "105", capacity: 70, hasAC: true, hasProjector: false, status: "AVAILABLE" },
    { id: "ab1-102", buildingId: "ab1", number: "102", capacity: 50, hasAC: true, hasProjector: true, status: "AVAILABLE" },
    { id: "ab1-201", buildingId: "ab1", number: "201", capacity: 50, hasAC: true, hasProjector: true, status: "RESERVED" },
    { id: "bt-501", buildingId: "bt", number: "501", capacity: 30, hasAC: true, hasProjector: true, status: "OCCUPIED", network: "down" },
    { id: "bt-502", buildingId: "bt", number: "502", capacity: 30, hasAC: true, hasProjector: true, status: "OCCUPIED", network: "down" },
    { id: "bt-503", buildingId: "bt", number: "503", capacity: 30, hasAC: true, hasProjector: true, status: "OCCUPIED", network: "down" },
    { id: "bt-power", buildingId: "bt", number: "Main Power Room", capacity: 0, hasAC: false, hasProjector: false, status: "CRITICAL", infra: true },
    { id: "lib-b1", buildingId: "lib", number: "Basement Study Hall", capacity: 120, hasAC: true, hasProjector: false, status: "AVAILABLE" },
    { id: "mb-110", buildingId: "mb", number: "110", capacity: 65, hasAC: true, hasProjector: true, status: "AVAILABLE" },
  ];

  const technicians = [
    { id: "t1", name: "R. Muthukumar", specialty: "HVAC", available: true },
    { id: "t2", name: "S. Priyanka", specialty: "Electrical", available: true },
    { id: "t3", name: "A. Fernandes", specialty: "Network/IT", available: true },
    { id: "t4", name: "K. Bala", specialty: "AV/Projector", available: false },
  ];

  const now = Date.now();
  const bookings = [
    { id: "bk1", roomId: "sjt-304", course: "PHY201 — Physics Lab", faculty: "Dr. Rangan", start: now + 12 * 60000, end: now + 132 * 60000, students: 42 },
    { id: "bk2", roomId: "ab2-203", course: "CSE310 — Systems Design", faculty: "Dr. Iyer", start: now + 15 * 60000, end: now + 105 * 60000, students: 38 },
    { id: "bk3", roomId: "bt-501", course: "ECE220 — Signals Lab", faculty: "Dr. Naidu", start: now - 10 * 60000, end: now + 50 * 60000, students: 28 },
    { id: "bk4", roomId: "bt-502", course: "CSE110 — Intro Programming", faculty: "Dr. Suresh", start: now - 5 * 60000, end: now + 55 * 60000, students: 55 },
    { id: "bk5", roomId: "bt-503", course: "MEC140 — CAD Tutorial", faculty: "Dr. Rekha", start: now, end: now + 60 * 60000, students: 24 },
    { id: "bk6", roomId: "sjt-401", course: "—", faculty: "—", start: now + 240 * 60000, end: now + 300 * 60000, students: 0 },
  ];

  // Historical maintenance incidents, seeded so Room 304 shows a real recurring HVAC pattern.
  const daysAgo = (d) => now - d * 86400000;
  const maintenanceTickets = [
    { id: "mt-101", roomId: "sjt-304", issue: "HVAC compressor fault", priority: "high", status: "resolved", technicianId: "t1", createdAt: daysAgo(28) },
    { id: "mt-102", roomId: "sjt-304", issue: "AC unit not cooling", priority: "medium", status: "resolved", technicianId: "t1", createdAt: daysAgo(23) },
    { id: "mt-103", roomId: "sjt-304", issue: "HVAC thermostat unresponsive", priority: "medium", status: "resolved", technicianId: "t1", createdAt: daysAgo(19) },
    { id: "mt-104", roomId: "sjt-304", issue: "AC unit not cooling", priority: "high", status: "resolved", technicianId: "t1", createdAt: daysAgo(14) },
    { id: "mt-105", roomId: "sjt-304", issue: "HVAC compressor fault", priority: "high", status: "resolved", technicianId: "t1", createdAt: daysAgo(9) },
    { id: "mt-106", roomId: "sjt-304", issue: "AC unit not cooling", priority: "medium", status: "resolved", technicianId: "t1", createdAt: daysAgo(4) },
    { id: "mt-201", roomId: "ab2-203", issue: "Projector lamp failure", priority: "medium", status: "resolved", technicianId: "t4", createdAt: daysAgo(31) },
    { id: "mt-202", roomId: "ab2-203", issue: "Projector no signal", priority: "medium", status: "resolved", technicianId: "t4", createdAt: daysAgo(6) },
    { id: "mt-301", roomId: "bt-501", issue: "Network switch failure", priority: "high", status: "resolved", technicianId: "t3", createdAt: daysAgo(17) },
    { id: "mt-401", roomId: "ab1-102", issue: "Flickering lights", priority: "low", status: "resolved", technicianId: "t2", createdAt: daysAgo(40) },
  ];

  const incidents = [
    { id: "inc-9001", title: "Projector recurring failure — AB2-203", buildingId: "ab2", roomId: "ab2-203", severity: "medium", status: "monitoring", createdAt: daysAgo(6), assignedTechnicianId: "t4", aiConfidence: 0.71 },
    { id: "inc-9002", title: "Network switch outage — Tech Tower", buildingId: "bt", roomId: null, severity: "high", status: "open", createdAt: daysAgo(0.02), assignedTechnicianId: null, aiConfidence: 0.0 },
  ];

  const notifications = [];
  const auditLog = [];
  const approvals = [];

  const policies = [
    { id: "p1", name: "Room-status & schedule reads", risk: "LOW", rule: "Auto-execute. No approval needed." },
    { id: "p2", name: "Create maintenance ticket", risk: "LOW", rule: "Auto-execute. Logged to audit trail." },
    { id: "p3", name: "Notify affected students/faculty (<100 recipients)", risk: "LOW", rule: "Auto-execute." },
    { id: "p4", name: "Assign technician", risk: "MEDIUM", rule: "Auto-execute if technician is available and matches specialty; else escalate." },
    { id: "p5", name: "Move an active booking to another room", risk: "MEDIUM", rule: "Displaces students/faculty already underway — always requires human approval." },
    { id: "p6", name: "Cancel a booking outright", risk: "HIGH", rule: "Requires human approval. Never automatic." },
    { id: "p7", name: "Spend budget / order replacement equipment", risk: "HIGH", rule: "Requires human approval with named approver." },
    { id: "p8", name: "Shut down building infrastructure (power, mains)", risk: "CRITICAL", rule: "Never auto-executed. Requires privileged, explicit dual confirmation." },
    { id: "p9", name: "Delete records / irreversible data changes", risk: "CRITICAL", rule: "Denied by default. Not permitted from the agent under any circumstance." },
  ];

  return { buildings, rooms, technicians, bookings, maintenanceTickets, incidents, notifications, auditLog, approvals, policies, idSeq: 9003, ticketSeq: 500, notifSeq: 1, approvalSeq: 1, logSeq: 1 };
}

// ---------------------------------------------------------------------------
// SMALL HELPERS
// ---------------------------------------------------------------------------
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmtMinsFromNow = (ts) => {
  const mins = Math.round((ts - Date.now()) / 60000);
  if (mins < 0) return `started ${Math.abs(mins)}m ago`;
  if (mins === 0) return "starting now";
  return `in ${mins}m`;
};
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// TOOL REGISTRY + POLICY ENGINE
// Every tool declares a risk level. The policy engine decides whether a
// call executes immediately, needs approval, or is denied outright. The
// agent (and the UI) never mutate state directly — everything routes
// through here, and every call is written to the audit log.
// ---------------------------------------------------------------------------
const TOOLS = {
  get_room_status: { risk: "LOW", label: "Check room status" },
  get_room_schedule: { risk: "LOW", label: "Check room schedule" },
  get_building_status: { risk: "LOW", label: "Check building status" },
  get_maintenance_history: { risk: "LOW", label: "Review maintenance history" },
  get_incident_history: { risk: "LOW", label: "Review incident history" },
  detect_recurring_issue: { risk: "LOW", label: "Analyze recurrence pattern" },
  get_system_policies: { risk: "LOW", label: "Read applicable policy" },
  create_maintenance_ticket: { risk: "LOW", label: "Create maintenance ticket" },
  find_available_room: { risk: "LOW", label: "Search for available room" },
  send_notification: { risk: "LOW", label: "Notify affected users" },
  assign_technician: { risk: "MEDIUM", label: "Assign technician" },
  update_maintenance_ticket: { risk: "MEDIUM", label: "Update maintenance ticket" },
  move_booking: { risk: "MEDIUM", label: "Move booking to another room", alwaysApprove: true },
  cancel_booking: { risk: "HIGH", label: "Cancel booking" },
  spend_budget: { risk: "HIGH", label: "Approve equipment spend" },
  shutdown_building_power: { risk: "CRITICAL", label: "Shut down building power", neverAuto: true },
  delete_records: { risk: "CRITICAL", label: "Delete records", neverAuto: true },
};

function decidePolicy(toolName) {
  const t = TOOLS[toolName];
  if (t.neverAuto || t.risk === "CRITICAL") return { action: "deny_auto_requires_privileged", risk: t.risk };
  if (t.risk === "HIGH") return { action: "require_approval", risk: t.risk };
  if (t.risk === "MEDIUM") return { action: t.alwaysApprove ? "require_approval" : "auto", risk: t.risk };
  return { action: "auto", risk: t.risk };
}

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------
export default function CampusOps() {
  const [store, setStore] = useState(() => makeSeed());
  const [page, setPage] = useState("dashboard");
  const [agentRuns, setAgentRuns] = useState([]); // list of {id, title, steps:[], status}
  const [activeRunId, setActiveRunId] = useState(null);
  const [liveFeed, setLiveFeed] = useState([]); // dashboard ticker
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const runLockRef = useRef(false);

  const activeRun = agentRuns.find((r) => r.id === activeRunId) || null;

  const pushLive = useCallback((msg) => {
    setLiveFeed((f) => [{ id: uid("live"), msg, ts: Date.now() }, ...f].slice(0, 12));
  }, []);

  const appendLog = useCallback((entry) => {
    setStore((s) => ({
      ...s,
      logSeq: s.logSeq + 1,
      auditLog: [{ id: `log-${s.logSeq}`, ts: Date.now(), ...entry }, ...s.auditLog],
    }));
  }, []);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Executes one tool call against the store, respecting policy. Returns {result, status}
  const execTool = useCallback(async (toolName, args, reason, runId) => {
    const policy = decidePolicy(toolName);
    const startedAt = Date.now();

    const setRunStep = (patch) => {
      setAgentRuns((runs) => runs.map((r) => r.id !== runId ? r : {
        ...r,
        steps: [...r.steps, { id: uid("step"), tool: toolName, args, reason, risk: policy.risk, ts: Date.now(), ...patch }],
      }));
    };

    if (policy.action === "deny_auto_requires_privileged") {
      appendLog({ actor: "AI Agent", tool: toolName, args, risk: policy.risk, approval: "BLOCKED", result: "Denied — critical action requires privileged human authorization", success: false, durationMs: 4 });
      setRunStep({ status: "blocked", result: "Blocked by policy engine: this action is CRITICAL risk and cannot be auto-executed." });
      pushLive(`Blocked CRITICAL action: ${TOOLS[toolName].label}`);
      const approvalId = uid("appr");
      setStore((s) => ({
        ...s,
        approvalSeq: s.approvalSeq + 1,
        approvals: [{
          id: approvalId, tool: toolName, args, reason, risk: policy.risk, status: "pending",
          privileged: true, createdAt: Date.now(), affected: args.affected || "Building-wide infrastructure",
        }, ...s.approvals],
      }));
      return { status: "blocked", approvalId };
    }

    if (policy.action === "require_approval") {
      appendLog({ actor: "AI Agent", tool: toolName, args, risk: policy.risk, approval: "PENDING", result: "Awaiting human approval", success: null, durationMs: 3 });
      setRunStep({ status: "awaiting_approval", result: "Paused — awaiting human approval." });
      pushLive(`Approval required: ${TOOLS[toolName].label}`);
      const approvalId = uid("appr");
      setStore((s) => ({
        ...s,
        approvalSeq: s.approvalSeq + 1,
        approvals: [{
          id: approvalId, tool: toolName, args, reason, risk: policy.risk, status: "pending",
          privileged: false, createdAt: Date.now(), runId, affected: args.affected || "—",
        }, ...s.approvals],
      }));
      return { status: "awaiting_approval", approvalId };
    }

    // AUTO-EXECUTE
    await sleep(550 + Math.random() * 350);
    const result = runToolLogic(toolName, args, store, setStore);
    const duration = Date.now() - startedAt;
    appendLog({ actor: "AI Agent", tool: toolName, args, risk: policy.risk, approval: "N/A", result: result.summary, success: true, durationMs: duration });
    setRunStep({ status: "done", result: result.summary });
    pushLive(result.summary);
    return { status: "done", result };
  }, [appendLog, pushLive, store]);

  // Resolve a pending approval (called from Approvals page or inline card)
  const resolveApproval = useCallback(async (approvalId, decision, privilegedConfirmed) => {
    const approval = store.approvals.find((a) => a.id === approvalId);
    if (!approval) return;

    if (approval.privileged && decision === "approve" && !privilegedConfirmed) return; // needs explicit second confirm

    setStore((s) => ({
      ...s,
      approvals: s.approvals.map((a) => a.id === approvalId ? { ...a, status: decision === "approve" ? "approved" : "denied", resolvedAt: Date.now() } : a),
    }));

    appendLog({
      actor: "Human Reviewer", tool: approval.tool, args: approval.args, risk: approval.risk,
      approval: decision === "approve" ? "APPROVED" : "DENIED", result: decision === "approve" ? "Human approved — executing" : "Human denied the action",
      success: decision === "approve", durationMs: 0,
    });

    const runId = approval.runId;
    if (decision === "deny") {
      pushLive(`Denied: ${TOOLS[approval.tool].label}`);
      if (runId) {
        setAgentRuns((runs) => runs.map((r) => r.id !== runId ? r : {
          ...r,
          steps: r.steps.map((st) => (st.tool === approval.tool && st.status === "awaiting_approval") ? { ...st, status: "denied", result: "Denied by human reviewer. Agent will not proceed with this action." } : st),
          status: "completed_with_denial",
        }));
      }
      return;
    }

    // Approved -> actually execute now
    await sleep(500);
    const result = runToolLogic(approval.tool, approval.args, store, setStore);
    appendLog({ actor: "AI Agent", tool: approval.tool, args: approval.args, risk: approval.risk, approval: "EXECUTED", result: result.summary, success: true, durationMs: 480 });
    pushLive(result.summary);
    if (runId) {
      setAgentRuns((runs) => runs.map((r) => r.id !== runId ? r : {
        ...r,
        steps: r.steps.map((st) => (st.tool === approval.tool && st.status === "awaiting_approval") ? { ...st, status: "done", result: result.summary } : st),
      }));
      // resume the rest of the scripted run
      resumeRun(runId, approval.tool);
    }
  }, [store, appendLog, pushLive]);

  // ---- Scripted demo runner -------------------------------------------------
  const runnersRef = useRef({}); // runId -> generator-like continuation state

  const startDemo = useCallback(async (demoKey) => {
    if (runLockRef.current) return;
    runLockRef.current = true;
    const script = DEMO_SCRIPTS[demoKey](store);
    const runId = uid("run");
    setAgentRuns((runs) => [{ id: runId, title: script.title, incidentSeed: script.incidentSeed, steps: [], status: "running" }, ...runs]);
    setActiveRunId(runId);
    setPage("agent");

    // create the incident up front so the UI has something to point at
    let incidentId = null;
    if (script.incidentSeed) {
      incidentId = uid("inc");
      setStore((s) => ({ ...s, incidents: [{ id: incidentId, ...script.incidentSeed, status: "open", createdAt: Date.now(), aiConfidence: 0 }, ...s.incidents] }));
    }
    runnersRef.current[runId] = { steps: script.steps, idx: 0, incidentId };
    await advanceRun(runId);
    runLockRef.current = false;
  }, [store]);

  const advanceRun = async (runId) => {
    const runner = runnersRef.current[runId];
    if (!runner) return;
    while (runner.idx < runner.steps.length) {
      const step = runner.steps[runner.idx];
      runner.idx += 1;
      await sleep(350);
      const outcome = await execTool(step.tool, step.args(runner), step.reason, runId);
      if (step.onResult) step.onResult(outcome, runner);
      if (outcome.status === "awaiting_approval" || outcome.status === "blocked") {
        return; // pause — will resume via resolveApproval -> resumeRun
      }
    }
    setAgentRuns((runs) => runs.map((r) => r.id !== runId ? r : { ...r, status: "completed" }));
    if (runner.incidentId) {
      setStore((s) => ({ ...s, incidents: s.incidents.map((i) => i.id === runner.incidentId ? { ...i, status: "resolved", aiConfidence: 0.93 } : i) }));
    }
  };

  const resumeRun = async (runId) => {
    await advanceRun(runId);
  };

  const resetDemo = () => {
    setStore(makeSeed());
    setAgentRuns([]);
    setActiveRunId(null);
    setLiveFeed([]);
    setSelectedIncident(null);
    runnersRef.current = {};
  };

  // ---- Free-text agent command (keyword-routed deterministic planner) -------
  const submitCommand = useCallback((text) => {
    const t = text.toLowerCase();
    if (t.includes("304") || (t.includes("ac") && t.includes("fail"))) return startDemo("ac");
    if (t.includes("projector") || t.includes("ab2")) return startDemo("projector");
    if (t.includes("network") || t.includes("tech tower") || t.includes("outage")) return startDemo("network");
    if (t.includes("power") || t.includes("shut")) return startDemo("shutdown");
    // generic fallback: run a light triage on whichever room number is mentioned
    startDemo("ac");
  }, [startDemo]);

  const pendingApprovals = store.approvals.filter((a) => a.status === "pending");

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "incidents", label: "Incidents", icon: AlertTriangle },
    { id: "agent", label: "Agent", icon: Bot },
    { id: "campus", label: "Campus", icon: Building2 },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "approvals", label: "Approvals", icon: ShieldCheck, badge: pendingApprovals.length },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "audit", label: "Audit Log", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0a0b0e] text-slate-200 flex" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/[0.06] flex flex-col bg-[#0c0d11]">
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-black" size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[13px] font-semibold tracking-tight text-white leading-none">CampusOps</div>
              <div className="text-[10.5px] text-slate-500 leading-none mt-1">Autonomous Ops Agent</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2.5 space-y-0.5">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors relative ${
                page === n.id ? "bg-white/[0.07] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <n.icon size={15} strokeWidth={2} />
              <span className="flex-1 text-left">{n.label}</span>
              {!!n.badge && (
                <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{n.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
            <CircleDot size={11} className="text-emerald-400" />
            <span className="text-[11px] text-emerald-300/90">DEMO MODE — live &amp; safe</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar page={page} pendingApprovals={pendingApprovals.length} onReset={resetDemo} onDemo={startDemo} />
        <div className="flex-1 overflow-y-auto">
          {page === "dashboard" && (
            <Dashboard store={store} liveFeed={liveFeed} onDemo={startDemo} onOpenIncident={(i) => { setSelectedIncident(i); setPage("incidents"); }} goto={setPage} />
          )}
          {page === "incidents" && (
            <IncidentsPage store={store} selected={selectedIncident} setSelected={setSelectedIncident} />
          )}
          {page === "agent" && (
            <AgentPage
              store={store}
              agentRuns={agentRuns}
              activeRun={activeRun}
              setActiveRunId={setActiveRunId}
              onSubmit={submitCommand}
              onDemo={startDemo}
              onReset={resetDemo}
              onResolveApproval={resolveApproval}
            />
          )}
          {page === "campus" && (
            <CampusPage store={store} selectedBuilding={selectedBuilding} setSelectedBuilding={setSelectedBuilding} />
          )}
          {page === "maintenance" && <MaintenancePage store={store} />}
          {page === "approvals" && <ApprovalsPage store={store} onResolve={resolveApproval} />}
          {page === "analytics" && <AnalyticsPage store={store} />}
          {page === "audit" && <AuditLogPage store={store} />}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool execution logic — the only place state actually mutates for agent actions
// ---------------------------------------------------------------------------
function runToolLogic(toolName, args, store, setStore) {
  switch (toolName) {
    case "get_room_status": {
      const room = store.rooms.find((r) => r.id === args.roomId);
      const fault = room?.network === "down" ? "network outage" : (args.fault || null);
      return { summary: `Room ${room?.number}: status ${room?.status}${fault ? `, fault detected — ${fault}` : ""}.`, data: room };
    }
    case "get_room_schedule": {
      const b = store.bookings.filter((bk) => bk.roomId === args.roomId);
      return { summary: b.length ? `Found ${b.length} booking(s) — next: ${b[0].course} (${fmtMinsFromNow(b[0].start)}).` : "No active bookings found.", data: b };
    }
    case "get_building_status": {
      const rooms = store.rooms.filter((r) => r.buildingId === args.buildingId);
      const affected = rooms.filter((r) => r.network === "down");
      return { summary: `${rooms.length} rooms surveyed — ${affected.length} reporting network outage.`, data: rooms };
    }
    case "get_maintenance_history": {
      const hist = store.maintenanceTickets.filter((m) => m.roomId === args.roomId);
      return { summary: `${hist.length} prior maintenance record(s) found for this room in the last 30 days.`, data: hist };
    }
    case "get_incident_history": {
      return { summary: `${store.incidents.length} incidents on record.`, data: store.incidents };
    }
    case "detect_recurring_issue": {
      const hist = store.maintenanceTickets.filter((m) => m.roomId === args.roomId);
      const count = hist.length;
      const confidence = count >= 4 ? "HIGH" : count >= 2 ? "MEDIUM" : "LOW";
      return { summary: count >= 3
        ? `Recurring issue detected: ${count} incidents in 30 days (${confidence} confidence). Preventive maintenance recommended.`
        : `No strong recurrence pattern (${count} prior incident(s)).`, data: { count, confidence } };
    }
    case "get_system_policies": {
      return { summary: "Policy engine consulted — action risk levels confirmed.", data: store.policies };
    }
    case "create_maintenance_ticket": {
      let ticketId;
      setStore((s) => {
        ticketId = `mt-${s.ticketSeq}`;
        window.__campusops_last_ticket_id = ticketId;
        return {
          ...s, ticketSeq: s.ticketSeq + 1,
          maintenanceTickets: [{ id: ticketId, roomId: args.roomId, issue: args.issue, priority: args.priority, status: "open", technicianId: null, createdAt: Date.now() }, ...s.maintenanceTickets],
          rooms: s.rooms.map((r) => r.id === args.roomId ? { ...r, status: args.priority === "critical" || args.priority === "high" ? "MAINTENANCE" : r.status } : r),
        };
      });
      return { summary: `Ticket ${ticketId || ""} created — priority ${args.priority.toUpperCase()}.` };
    }
    case "update_maintenance_ticket": {
      setStore((s) => ({ ...s, maintenanceTickets: s.maintenanceTickets.map((m) => m.id === args.ticketId ? { ...m, ...args.patch } : m) }));
      return { summary: `Ticket ${args.ticketId} updated.` };
    }
    case "assign_technician": {
      const tech = store.technicians.find((t) => t.specialty === args.specialty && t.available);
      if (!tech) return { summary: `No available ${args.specialty} technician — escalating to on-call roster.` };
      setStore((s) => ({
        ...s,
        technicians: s.technicians.map((t) => t.id === tech.id ? { ...t, available: false } : t),
        maintenanceTickets: s.maintenanceTickets.map((m) => m.id === args.ticketId ? { ...m, technicianId: tech.id, status: "assigned" } : m),
      }));
      return { summary: `${tech.name} (${tech.specialty}) assigned to ticket ${args.ticketId}.` };
    }
    case "find_available_room": {
      const candidates = store.rooms.filter((r) => r.status === "AVAILABLE" && r.capacity >= (args.minCapacity || 0) && (!args.requireProjector || r.hasProjector) && r.id !== args.excludeRoomId);
      const pick = candidates.sort((a, b) => a.capacity - b.capacity)[0];
      return { summary: pick ? `Room ${pick.number} available (capacity ${pick.capacity}) — nearest match.` : "No suitable alternative room found.", data: pick };
    }
    case "move_booking": {
      setStore((s) => ({
        ...s,
        bookings: s.bookings.map((b) => b.id === args.bookingId ? { ...b, roomId: args.toRoomId } : b),
        rooms: s.rooms.map((r) => {
          if (r.id === args.toRoomId) return { ...r, status: "OCCUPIED" };
          if (r.id === args.fromRoomId) return { ...r, status: r.status };
          return r;
        }),
      }));
      return { summary: `Booking moved to Room ${args.toRoomNumber}.` };
    }
    case "cancel_booking": {
      setStore((s) => ({ ...s, bookings: s.bookings.filter((b) => b.id !== args.bookingId) }));
      return { summary: `Booking ${args.bookingId} cancelled.` };
    }
    case "send_notification": {
      let nid;
      setStore((s) => {
        nid = `n-${s.notifSeq}`;
        return { ...s, notifSeq: s.notifSeq + 1, notifications: [{ id: nid, message: args.message, recipients: args.recipients, ts: Date.now() }, ...s.notifications] };
      });
      return { summary: `${args.recipients} user(s) notified: "${args.message}"` };
    }
    case "shutdown_building_power": {
      setStore((s) => ({ ...s, rooms: s.rooms.map((r) => r.buildingId === args.buildingId ? { ...r, status: "MAINTENANCE" } : r) }));
      return { summary: `Privileged override executed — power isolated for ${args.buildingId.toUpperCase()}. This required dual human authorization.` };
    }
    default:
      return { summary: "No-op." };
  }
}

// ---------------------------------------------------------------------------
// DEMO SCRIPTS — deterministic, chained tool sequences (the "wow" flows)
// ---------------------------------------------------------------------------
const DEMO_SCRIPTS = {
  ac: (store) => ({
    title: "Room 304 AC Failure",
    incidentSeed: { title: "Room 304 AC Failure — Physics Lab imminent", buildingId: "sjt", roomId: "sjt-304", severity: "critical" },
    steps: [
      { tool: "get_room_status", reason: "Investigating reported fault", args: () => ({ roomId: "sjt-304", fault: "AC compressor fault, ambient temp 34°C" }) },
      { tool: "get_room_schedule", reason: "Checking what's affected", args: () => ({ roomId: "sjt-304" }) },
      { tool: "get_maintenance_history", reason: "Checking for prior related failures", args: () => ({ roomId: "sjt-304" }) },
      { tool: "create_maintenance_ticket", reason: "Fault confirmed — logging repair request", args: () => ({ roomId: "sjt-304", issue: "AC compressor fault", priority: "critical" }) },
      { tool: "assign_technician", reason: "Routing to HVAC specialist", args: (r) => ({ ticketId: latestTicketId(r), specialty: "HVAC" }) },
      { tool: "find_available_room", reason: "Physics Lab starts in 12 minutes — sourcing an alternative", args: () => ({ minCapacity: 42, requireProjector: true, excludeRoomId: "sjt-304" }) },
      { tool: "move_booking", reason: "Relocating the Physics Lab before class start — displaces an active booking, requires approval", args: () => ({ bookingId: "bk1", fromRoomId: "sjt-304", toRoomId: "sjt-401", toRoomNumber: "401" }), onResult: () => {} },
      { tool: "send_notification", reason: "Informing affected students and faculty", args: () => ({ message: "PHY201 Physics Lab has moved to Room 401 due to an AC fault in 304.", recipients: 42 }) },
      { tool: "detect_recurring_issue", reason: "Checking whether this is a one-off or a pattern", args: () => ({ roomId: "sjt-304" }) },
    ],
  }),
  projector: (store) => ({
    title: "AB2-203 Projector Failure",
    incidentSeed: { title: "Projector failure — AB2-203, class in 15 min", buildingId: "ab2", roomId: "ab2-203", severity: "medium" },
    steps: [
      { tool: "get_room_status", reason: "Investigating reported fault", args: () => ({ roomId: "ab2-203", fault: "no signal from projector unit" }) },
      { tool: "get_room_schedule", reason: "Checking what's affected", args: () => ({ roomId: "ab2-203" }) },
      { tool: "get_maintenance_history", reason: "Checking for prior related failures", args: () => ({ roomId: "ab2-203" }) },
      { tool: "create_maintenance_ticket", reason: "Logging repair request", args: () => ({ roomId: "ab2-203", issue: "Projector — no signal", priority: "medium" }) },
      { tool: "assign_technician", reason: "Routing to AV specialist", args: (r) => ({ ticketId: latestTicketId(r), specialty: "AV/Projector" }) },
      { tool: "send_notification", reason: "Giving faculty a heads-up before class starts", args: () => ({ message: "AB2-203 projector is down; a technician is en route. Class will proceed with the whiteboard in the interim.", recipients: 38 }) },
      { tool: "detect_recurring_issue", reason: "Checking whether this is a pattern", args: () => ({ roomId: "ab2-203" }) },
    ],
  }),
  network: (store) => ({
    title: "Tech Tower Network Outage",
    incidentSeed: { title: "Network outage — Tech Tower, 3 classes affected", buildingId: "bt", roomId: null, severity: "high" },
    steps: [
      { tool: "get_building_status", reason: "Surveying the building for scope of the outage", args: () => ({ buildingId: "bt" }) },
      { tool: "get_maintenance_history", reason: "Checking prior network incidents", args: () => ({ roomId: "bt-501" }) },
      { tool: "create_maintenance_ticket", reason: "Logging a building-wide network fault", args: () => ({ roomId: "bt-501", issue: "Core switch failure — 3 rooms affected", priority: "high" }) },
      { tool: "assign_technician", reason: "Routing to network/IT specialist", args: (r) => ({ ticketId: latestTicketId(r), specialty: "Network/IT" }) },
      { tool: "send_notification", reason: "Notifying all affected classes", args: () => ({ message: "Network is down across Tech Tower (rooms 501-503). IT is on site; online tools may be unavailable.", recipients: 107 }) },
      { tool: "detect_recurring_issue", reason: "Checking whether this building has a pattern of outages", args: () => ({ roomId: "bt-501" }) },
    ],
  }),
  shutdown: () => ({
    title: "Shut Down Building Main Power",
    incidentSeed: null,
    steps: [
      { tool: "get_system_policies", reason: "Checking whether this action is permitted", args: () => ({}) },
      { tool: "shutdown_building_power", reason: "User requested a full building power shutdown — CRITICAL risk, evaluating against policy", args: () => ({ buildingId: "bt", affected: "All of Tech Tower — power, lighting, HVAC, network" }) },
    ],
  }),
};

function latestTicketId(runner) {
  // The ticket id isn't known until create_maintenance_ticket runs; find it from the log via closure isn't
  // available here, so we look it up defensively at call time using a global-ish trick: read from window.
  return window.__campusops_last_ticket_id || "the new ticket";
}

// ---------------------------------------------------------------------------
// SHARED BITS
// ---------------------------------------------------------------------------
function TopBar({ page, pendingApprovals, onReset, onDemo }) {
  const titles = {
    dashboard: "Command Center", incidents: "Incidents", agent: "Agent Console", campus: "Campus",
    maintenance: "Maintenance", approvals: "Approvals & Guardrails", analytics: "Analytics & Learning", audit: "Audit Log",
  };
  return (
    <div className="h-14 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#0a0b0e]/80 backdrop-blur">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-medium text-white">{titles[page]}</h1>
        {pendingApprovals > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5">
            <ShieldAlert size={11} /> {pendingApprovals} awaiting approval
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onReset()} className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
          <RotateCcw size={13} /> Reset demo
        </button>
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] ${className}`}>{children}</div>;
}

function RiskBadge({ risk }) {
  const s = RISK_STYLES[risk];
  return <span className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md border ${s.text} ${s.bg} ${s.border}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{risk}</span>;
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.AVAILABLE;
  return <span className={`inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full ${s.text} ${s.bg}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
function Dashboard({ store, liveFeed, onDemo, onOpenIncident, goto }) {
  const activeIncidents = store.incidents.filter((i) => i.status !== "resolved");
  const criticalIncidents = store.incidents.filter((i) => i.severity === "critical" && i.status !== "resolved");
  const pendingApprovals = store.approvals.filter((a) => a.status === "pending");
  const openTickets = store.maintenanceTickets.filter((m) => m.status !== "resolved");
  const doneLogs = store.auditLog.filter((l) => l.success !== null);
  const successRate = doneLogs.length ? Math.round((doneLogs.filter((l) => l.success).length / doneLogs.length) * 100) : 100;

  const trend = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
    return days.map((d, i) => ({ day: d, incidents: [3, 2, 4, 3, 5, 2, activeIncidents.length + 2][i] }));
  }, [activeIncidents.length]);

  const buildingHealth = store.buildings.map((b) => {
    const rooms = store.rooms.filter((r) => r.buildingId === b.id);
    const issues = rooms.filter((r) => r.status === "MAINTENANCE" || r.status === "CRITICAL" || r.network === "down").length;
    const score = Math.max(20, 100 - issues * 22);
    return { name: b.name, score };
  });

  const stats = [
    { label: "Active Incidents", value: activeIncidents.length, icon: AlertTriangle, tone: "text-sky-400" },
    { label: "Critical Issues", value: criticalIncidents.length, icon: ShieldAlert, tone: "text-rose-400" },
    { label: "Pending Approvals", value: pendingApprovals.length, icon: ShieldCheck, tone: "text-amber-400" },
    { label: "Open Maintenance", value: openTickets.length, icon: Wrench, tone: "text-violet-400" },
    { label: "Agent Success Rate", value: `${successRate}%`, icon: Gauge, tone: "text-emerald-400" },
  ];

  const recurring = topRecurring(store);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={16} className={s.tone} />
            </div>
            <div className="text-2xl font-semibold text-white tracking-tight">{s.value}</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium text-white flex items-center gap-2"><Activity size={14} className="text-cyan-400" /> Live Agent Activity</h3>
            <span className="text-[10.5px] text-slate-500">real-time</span>
          </div>
          {liveFeed.length === 0 ? (
            <div className="text-center py-10">
              <Bot size={26} className="mx-auto text-slate-600 mb-3" />
              <p className="text-[12.5px] text-slate-500 mb-4">No active agent runs. Trigger a scenario to see the agent work.</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <DemoBtn onClick={() => onDemo("ac")} label="Run AC Failure Demo" />
                <DemoBtn onClick={() => onDemo("projector")} label="Run Projector Demo" />
                <DemoBtn onClick={() => onDemo("network")} label="Run Network Outage Demo" />
              </div>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {liveFeed.map((f) => (
                <li key={f.id} className="flex items-start gap-2.5 text-[12.5px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span className="text-slate-300 flex-1">{f.msg}</span>
                  <span className="text-[10.5px] text-slate-600 font-mono shrink-0">{fmtTime(f.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-[13px] font-medium text-white mb-4 flex items-center gap-2"><Sparkles size={14} className="text-amber-300" /> Top Recurring Problems</h3>
          <div className="space-y-3">
            {recurring.map((r) => (
              <div key={r.roomId} className="flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] text-slate-200">{r.roomLabel}</div>
                  <div className="text-[10.5px] text-slate-500">{r.type} · {r.count} incidents / 30d</div>
                </div>
                <span className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded ${r.confidence === "HIGH" ? "text-rose-300 bg-rose-500/10" : "text-amber-300 bg-amber-500/10"}`}>{r.confidence}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <h3 className="text-[13px] font-medium text-white mb-4">Incident Trend — 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={22} />
              <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="incidents" stroke="#22d3ee" strokeWidth={2} fill="url(#incGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-[13px] font-medium text-white mb-4">Building Health</h3>
          <div className="space-y-3">
            {buildingHealth.map((b) => (
              <div key={b.name}>
                <div className="flex justify-between text-[11.5px] mb-1"><span className="text-slate-300">{b.name}</span><span className="text-slate-500">{b.score}%</span></div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full ${b.score > 75 ? "bg-emerald-400" : b.score > 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${b.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium text-white">Recent Incidents</h3>
          <button onClick={() => goto("incidents")} className="text-[11.5px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">View all <ChevronRight size={12} /></button>
        </div>
        <div className="space-y-1.5">
          {store.incidents.slice(0, 5).map((i) => (
            <button key={i.id} onClick={() => onOpenIncident(i)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left">
              <div className="flex items-center gap-3">
                <RiskBadge risk={i.severity.toUpperCase()} />
                <span className="text-[12.5px] text-slate-200">{i.title}</span>
              </div>
              <span className="text-[10.5px] text-slate-500">{i.status}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DemoBtn({ onClick, label }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-[12px] font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors">
      <Play size={12} /> {label}
    </button>
  );
}

function topRecurring(store) {
  const byRoom = {};
  for (const m of store.maintenanceTickets) {
    byRoom[m.roomId] = byRoom[m.roomId] || { count: 0, type: m.issue.split(" ")[0] };
    byRoom[m.roomId].count += 1;
  }
  return Object.entries(byRoom)
    .map(([roomId, v]) => {
      const room = store.rooms.find((r) => r.id === roomId);
      const b = store.buildings.find((bb) => bb.id === room?.buildingId);
      return { roomId, roomLabel: room ? `${b?.name} ${room.number}` : roomId, type: v.type, count: v.count, confidence: v.count >= 4 ? "HIGH" : v.count >= 2 ? "MEDIUM" : "LOW" };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

// ---------------------------------------------------------------------------
// INCIDENTS PAGE
// ---------------------------------------------------------------------------
function IncidentsPage({ store, selected, setSelected }) {
  return (
    <div className="p-6 grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-2">
        {store.incidents.map((i) => {
          const room = store.rooms.find((r) => r.id === i.roomId);
          const building = store.buildings.find((b) => b.id === i.buildingId);
          const tech = store.technicians.find((t) => t.id === i.assignedTechnicianId);
          return (
            <Card key={i.id} className={`p-4 cursor-pointer transition-colors ${selected?.id === i.id ? "border-cyan-500/40 bg-cyan-500/[0.04]" : "hover:bg-white/[0.03]"}`} >
              <div onClick={() => setSelected(i)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RiskBadge risk={i.severity.toUpperCase()} />
                    <span className="text-[12.5px] font-mono text-slate-500">{i.id}</span>
                  </div>
                  <span className={`text-[10.5px] px-2 py-0.5 rounded-full ${i.status === "resolved" ? "bg-emerald-500/10 text-emerald-300" : i.status === "monitoring" ? "bg-sky-500/10 text-sky-300" : "bg-amber-500/10 text-amber-300"}`}>{i.status}</span>
                </div>
                <div className="text-[13.5px] text-white font-medium mb-1">{i.title}</div>
                <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {building?.name}{room ? ` · ${room.number}` : ""}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {new Date(i.createdAt).toLocaleString()}</span>
                  {tech && <span className="flex items-center gap-1"><UserCog size={11} /> {tech.name}</span>}
                  <span className="flex items-center gap-1"><BadgeCheck size={11} /> AI confidence {Math.round((i.aiConfidence || 0) * 100)}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div>
        {selected ? (
          <IncidentDetail incident={selected} store={store} />
        ) : (
          <Card className="p-8 text-center">
            <AlertCircle size={22} className="mx-auto text-slate-600 mb-2" />
            <p className="text-[12.5px] text-slate-500">Select an incident to see full details.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function IncidentDetail({ incident, store }) {
  const room = store.rooms.find((r) => r.id === incident.roomId);
  const building = store.buildings.find((b) => b.id === incident.buildingId);
  const related = store.auditLog.filter((l) => JSON.stringify(l.args || {}).includes(incident.roomId || "___none"));
  return (
    <Card className="p-5 sticky top-4">
      <RiskBadge risk={incident.severity.toUpperCase()} />
      <h3 className="text-[14px] font-medium text-white mt-2 mb-3">{incident.title}</h3>
      <div className="space-y-2 text-[12.5px] text-slate-400 mb-4">
        <div className="flex justify-between"><span>Building</span><span className="text-slate-200">{building?.name}</span></div>
        {room && <div className="flex justify-between"><span>Room</span><span className="text-slate-200">{room.number}</span></div>}
        <div className="flex justify-between"><span>Status</span><span className="text-slate-200">{incident.status}</span></div>
        <div className="flex justify-between"><span>AI Confidence</span><span className="text-slate-200">{Math.round((incident.aiConfidence || 0) * 100)}%</span></div>
        <div className="flex justify-between"><span>Created</span><span className="text-slate-200">{new Date(incident.createdAt).toLocaleTimeString()}</span></div>
      </div>
      <div className="border-t border-white/[0.06] pt-3">
        <div className="text-[11.5px] text-slate-500 mb-2">Related agent actions</div>
        {related.length === 0 ? <p className="text-[11.5px] text-slate-600">No related actions logged yet.</p> : (
          <ul className="space-y-1.5">
            {related.slice(0, 6).map((l) => <li key={l.id} className="text-[11.5px] text-slate-400">· {l.result}</li>)}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AGENT PAGE — the hero page
// ---------------------------------------------------------------------------
function AgentPage({ store, agentRuns, activeRun, setActiveRunId, onSubmit, onDemo, onReset, onResolveApproval }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeRun?.steps.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput("");
  };

  const pendingForRun = activeRun ? store.approvals.filter((a) => a.runId === activeRun.id && a.status === "pending") : [];
  const privilegedForRun = activeRun ? store.approvals.filter((a) => a.privileged && a.status === "pending") : [];

  return (
    <div className="p-6 grid grid-cols-12 gap-4 h-full">
      {/* LEFT: command input + run history */}
      <div className="col-span-3 flex flex-col gap-3">
        <Card className="p-3">
          <div className="text-[11px] text-slate-500 mb-2 px-1">Command the agent</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="e.g. Room 304 AC failed, physics lab in 12 minutes. Handle it."
            rows={3}
            className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-[12.5px] text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-cyan-500/40"
          />
          <button onClick={handleSend} className="mt-2 w-full flex items-center justify-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[12px] font-medium py-2 rounded-lg border border-cyan-500/30 transition-colors">
            <Send size={13} /> Dispatch agent
          </button>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-slate-500 mb-2 px-1">One-click scenarios</div>
          <div className="space-y-1.5">
            <ScenarioBtn onClick={() => onDemo("ac")} icon={Thermometer} label="AC Failure — Room 304" tone="text-rose-400" />
            <ScenarioBtn onClick={() => onDemo("projector")} icon={Projector} label="Projector Failure — AB2-203" tone="text-amber-400" />
            <ScenarioBtn onClick={() => onDemo("network")} icon={Wifi} label="Network Outage — Tech Tower" tone="text-sky-400" />
            <ScenarioBtn onClick={() => onDemo("shutdown")} icon={Power} label="Shut Down Building Power" tone="text-slate-400" danger />
          </div>
          <button onClick={onReset} className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11.5px] text-slate-500 hover:text-slate-300 py-1.5">
            <RotateCcw size={12} /> Reset session
          </button>
        </Card>
        {agentRuns.length > 0 && (
          <Card className="p-3 flex-1 overflow-y-auto">
            <div className="text-[11px] text-slate-500 mb-2 px-1">Run history</div>
            <div className="space-y-1">
              {agentRuns.map((r) => (
                <button key={r.id} onClick={() => setActiveRunId(r.id)} className={`w-full text-left px-2.5 py-2 rounded-lg text-[12px] ${activeRun?.id === r.id ? "bg-white/[0.06] text-white" : "text-slate-400 hover:bg-white/[0.03]"}`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate">{r.title}</span>
                    {r.status === "running" ? <Loader2 size={11} className="animate-spin text-cyan-400 shrink-0" /> : r.status === "completed" ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" /> : <ShieldAlert size={11} className="text-amber-400 shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* CENTER: execution timeline */}
      <div className="col-span-6 flex flex-col">
        <Card className="p-4 flex-1 flex flex-col min-h-0">
          {!activeRun ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Bot size={30} className="text-slate-700 mb-3" />
              <p className="text-[13px] text-slate-500 mb-1">No active run</p>
              <p className="text-[11.5px] text-slate-600">Type a command or launch a scenario to watch the agent work.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <div className="text-[13.5px] font-medium text-white">{activeRun.title}</div>
                  <div className="text-[11px] text-slate-500">{activeRun.steps.length} tool call(s) so far</div>
                </div>
                {activeRun.status === "running" && <span className="flex items-center gap-1.5 text-[11px] text-cyan-300"><Loader2 size={12} className="animate-spin" /> running</span>}
                {activeRun.status === "completed" && <span className="flex items-center gap-1.5 text-[11px] text-emerald-300"><CheckCircle2 size={12} /> completed</span>}
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-0">
                {activeRun.steps.map((st, idx) => <TimelineStep key={st.id} step={st} isLast={idx === activeRun.steps.length - 1} />)}
                {activeRun.status === "completed" && <RunSummary run={activeRun} store={store} />}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* RIGHT: context / tools / approvals */}
      <div className="col-span-3 space-y-3">
        <Card className="p-4">
          <h4 className="text-[12px] font-medium text-white mb-2 flex items-center gap-1.5"><ShieldCheck size={13} className="text-amber-400" /> Approval needed</h4>
          {pendingForRun.length === 0 && privilegedForRun.length === 0 ? (
            <p className="text-[11.5px] text-slate-600">Nothing waiting on you right now.</p>
          ) : (
            <div className="space-y-2">
              {[...pendingForRun, ...privilegedForRun].map((a) => (
                <InlineApproval key={a.id} approval={a} onResolve={onResolveApproval} />
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h4 className="text-[12px] font-medium text-white mb-2">Available tools</h4>
          <div className="grid grid-cols-1 gap-1">
            {Object.entries(TOOLS).map(([name, t]) => (
              <div key={name} className="flex items-center justify-between text-[11px] py-1">
                <span className="text-slate-400 font-mono">{name}</span>
                <RiskBadge risk={t.risk} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScenarioBtn({ onClick, icon: Icon, label, tone, danger }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] transition-colors border ${danger ? "border-rose-500/25 hover:bg-rose-500/10 text-rose-300" : "border-white/[0.06] hover:bg-white/[0.04] text-slate-300"}`}>
      <Icon size={13} className={tone} /> {label}
    </button>
  );
}

function TimelineStep({ step }) {
  const s = RISK_STYLES[step.risk];
  return (
    <div className="flex gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex flex-col items-center pt-0.5">
        {step.status === "done" && <CheckCircle2 size={14} className="text-emerald-400" />}
        {step.status === "awaiting_approval" && <Loader2 size={14} className="text-amber-400 animate-spin" />}
        {step.status === "blocked" && <XCircle size={14} className="text-rose-400" />}
        {step.status === "denied" && <XCircle size={14} className="text-slate-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] text-slate-200 font-medium">{TOOLS[step.tool]?.label || step.tool}</span>
          <RiskBadge risk={step.risk} />
          <span className="text-[10px] text-slate-600 font-mono">{fmtTime(step.ts)}</span>
        </div>
        <div className="text-[11.5px] text-slate-500 mt-0.5">{step.reason}</div>
        {step.result && <div className={`text-[12px] mt-1 ${step.status === "blocked" || step.status === "denied" ? "text-rose-300/90" : "text-slate-300"}`}>{step.result}</div>}
      </div>
    </div>
  );
}

function InlineApproval({ approval, onResolve }) {
  const [confirming, setConfirming] = useState(false);
  const s = RISK_STYLES[approval.risk];
  return (
    <div className={`rounded-lg border p-3 ${s.border} ${s.bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <RiskBadge risk={approval.risk} />
        {approval.privileged && <span className="text-[9.5px] text-rose-300 flex items-center gap-1"><Lock size={9} /> privileged</span>}
      </div>
      <div className="text-[12px] text-slate-200 font-medium mb-1">{TOOLS[approval.tool]?.label}</div>
      <div className="text-[11px] text-slate-500 mb-2">{approval.reason}</div>
      {!confirming ? (
        <div className="flex gap-1.5">
          <button onClick={() => approval.privileged ? setConfirming(true) : onResolve(approval.id, "approve")} className="flex-1 text-[11px] font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 py-1.5 rounded-md border border-emerald-500/30">Approve</button>
          <button onClick={() => onResolve(approval.id, "deny")} className="flex-1 text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 py-1.5 rounded-md border border-rose-500/25">Deny</button>
        </div>
      ) : (
        <div>
          <p className="text-[10.5px] text-rose-300 mb-2">This is a CRITICAL action. Confirm privileged override — this bypasses normal automation limits.</p>
          <div className="flex gap-1.5">
            <button onClick={() => onResolve(approval.id, "approve", true)} className="flex-1 text-[11px] font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 py-1.5 rounded-md border border-rose-500/40">Confirm override</button>
            <button onClick={() => setConfirming(false)} className="flex-1 text-[11px] font-medium bg-white/[0.05] text-slate-300 py-1.5 rounded-md border border-white/[0.08]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RunSummary({ run, store }) {
  const doneSteps = run.steps.filter((s) => s.status === "done");
  const notified = doneSteps.find((s) => s.tool === "send_notification");
  const recurring = doneSteps.find((s) => s.tool === "detect_recurring_issue");
  const moved = doneSteps.find((s) => s.tool === "move_booking");
  const ticket = doneSteps.find((s) => s.tool === "create_maintenance_ticket");
  return (
    <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
      <div className="flex items-center gap-2 mb-3"><CheckCircle2 size={15} className="text-emerald-400" /><span className="text-[13px] font-medium text-white">Incident resolved</span></div>
      <ul className="space-y-1.5 text-[12px] text-slate-300">
        {ticket && <li>✓ {ticket.result}</li>}
        {moved && <li>✓ {moved.result}</li>}
        {notified && <li>✓ {notified.result}</li>}
        {recurring && <li>✓ {recurring.result}</li>}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CAMPUS PAGE
// ---------------------------------------------------------------------------
function CampusPage({ store, selectedBuilding, setSelectedBuilding }) {
  const buildingRooms = selectedBuilding ? store.rooms.filter((r) => r.buildingId === selectedBuilding) : [];
  return (
    <div className="p-6 grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <div className="grid grid-cols-3 gap-3">
          {store.buildings.map((b) => {
            const rooms = store.rooms.filter((r) => r.buildingId === b.id);
            const issues = rooms.filter((r) => r.status !== "AVAILABLE" && r.status !== "OCCUPIED" && r.status !== "RESERVED").length;
            return (
              <Card key={b.id} className={`p-4 cursor-pointer transition-all ${selectedBuilding === b.id ? "border-cyan-500/40 bg-cyan-500/[0.04]" : "hover:border-white/[0.15]"}`} >
                <div onClick={() => setSelectedBuilding(b.id)}>
                  <Building2 size={18} className="text-slate-500 mb-3" />
                  <div className="text-[13px] font-medium text-white mb-1">{b.name}</div>
                  <div className="text-[11px] text-slate-500 mb-3">{rooms.length} rooms tracked</div>
                  {issues > 0 ? (
                    <span className="text-[10.5px] text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full">{issues} needs attention</span>
                  ) : (
                    <span className="text-[10.5px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">All systems normal</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <Card className="p-4">
        {!selectedBuilding ? (
          <div className="text-center py-10">
            <MapPin size={20} className="mx-auto text-slate-600 mb-2" />
            <p className="text-[12px] text-slate-500">Select a building to inspect its rooms.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[12.5px] font-medium text-white mb-2">{store.buildings.find((b) => b.id === selectedBuilding)?.name}</div>
            {buildingRooms.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[r.status].bg} ring-2 ${STATUS_STYLES[r.status].ring}`} />
                  <span className="text-[12px] text-slate-300">{r.number}</span>
                  {r.network === "down" && <Wifi size={11} className="text-rose-400" />}
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAINTENANCE PAGE
// ---------------------------------------------------------------------------
function MaintenancePage({ store }) {
  const sorted = [...store.maintenanceTickets].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="p-6">
      <Card className="overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-slate-500 text-left">
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">Room</th>
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Technician</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => {
              const room = store.rooms.find((r) => r.id === m.roomId);
              const tech = store.technicians.find((t) => t.id === m.technicianId);
              return (
                <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-slate-400">{m.id}</td>
                  <td className="px-4 py-2.5 text-slate-300">{room?.number}</td>
                  <td className="px-4 py-2.5 text-slate-300">{m.issue}</td>
                  <td className="px-4 py-2.5"><RiskBadge risk={m.priority === "critical" ? "CRITICAL" : m.priority === "high" ? "HIGH" : m.priority === "medium" ? "MEDIUM" : "LOW"} /></td>
                  <td className="px-4 py-2.5 text-slate-400">{tech ? tech.name : "Unassigned"}</td>
                  <td className="px-4 py-2.5"><span className={`text-[10.5px] px-2 py-0.5 rounded-full ${m.status === "resolved" ? "bg-emerald-500/10 text-emerald-300" : m.status === "assigned" ? "bg-sky-500/10 text-sky-300" : "bg-amber-500/10 text-amber-300"}`}>{m.status}</span></td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APPROVALS PAGE
// ---------------------------------------------------------------------------
function ApprovalsPage({ store, onResolve }) {
  const pending = store.approvals.filter((a) => a.status === "pending");
  const resolved = store.approvals.filter((a) => a.status !== "pending");
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-[12.5px] font-medium text-slate-400 mb-3">Pending ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card className="p-8 text-center"><ShieldCheck size={20} className="mx-auto text-slate-600 mb-2" /><p className="text-[12px] text-slate-500">Nothing needs your review right now.</p></Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {pending.map((a) => <ApprovalCard key={a.id} approval={a} onResolve={onResolve} store={store} />)}
          </div>
        )}
      </div>
      {resolved.length > 0 && (
        <div>
          <h3 className="text-[12.5px] font-medium text-slate-400 mb-3">Resolved</h3>
          <div className="space-y-1.5">
            {resolved.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/[0.02] text-[12px]">
                <div className="flex items-center gap-3">
                  <RiskBadge risk={a.risk} />
                  <span className="text-slate-300">{TOOLS[a.tool]?.label}</span>
                </div>
                <span className={a.status === "approved" ? "text-emerald-400" : "text-rose-400"}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ approval, onResolve, store }) {
  const [confirming, setConfirming] = useState(false);
  const s = RISK_STYLES[approval.risk];
  return (
    <Card className={`p-4 border ${s.border}`}>
      <div className="flex items-center justify-between mb-2">
        <RiskBadge risk={approval.risk} />
        {approval.privileged && <span className="text-[10px] text-rose-300 flex items-center gap-1"><Lock size={10} /> privileged authorization required</span>}
      </div>
      <div className="text-[13.5px] font-medium text-white mb-1">{TOOLS[approval.tool]?.label}</div>
      <div className="text-[12px] text-slate-500 mb-3">{approval.reason}</div>
      <div className="space-y-1 text-[11.5px] text-slate-400 mb-3 bg-black/20 rounded-lg p-2.5">
        <div className="flex justify-between"><span>Affected</span><span className="text-slate-300">{approval.affected}</span></div>
        <div className="flex justify-between"><span>Arguments</span><span className="text-slate-300 font-mono truncate max-w-[200px]">{JSON.stringify(approval.args)}</span></div>
      </div>
      {!confirming ? (
        <div className="flex gap-2">
          <button onClick={() => approval.privileged ? setConfirming(true) : onResolve(approval.id, "approve")} className="flex-1 text-[12px] font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 py-2 rounded-lg border border-emerald-500/30">Approve</button>
          <button onClick={() => onResolve(approval.id, "deny")} className="flex-1 text-[12px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 py-2 rounded-lg border border-rose-500/25">Deny</button>
        </div>
      ) : (
        <div>
          <p className="text-[11px] text-rose-300 mb-2">CRITICAL action — confirm dual authorization override.</p>
          <div className="flex gap-2">
            <button onClick={() => onResolve(approval.id, "approve", true)} className="flex-1 text-[12px] font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 py-2 rounded-lg border border-rose-500/40">Confirm override</button>
            <button onClick={() => setConfirming(false)} className="flex-1 text-[12px] font-medium bg-white/[0.05] text-slate-300 py-2 rounded-lg border border-white/[0.08]">Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ANALYTICS PAGE
// ---------------------------------------------------------------------------
function AnalyticsPage({ store }) {
  const byBuilding = store.buildings.map((b) => ({
    name: b.name,
    incidents: store.maintenanceTickets.filter((m) => store.rooms.find((r) => r.id === m.roomId)?.buildingId === b.id).length,
  }));
  const byType = useMemo(() => {
    const map = {};
    for (const m of store.maintenanceTickets) {
      const key = m.issue.includes("HVAC") || m.issue.includes("AC") ? "HVAC" : m.issue.includes("Projector") ? "AV" : m.issue.includes("Network") ? "Network" : m.issue.includes("light") ? "Electrical" : "Other";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [store.maintenanceTickets]);
  const COLORS = ["#22d3ee", "#f59e0b", "#f43f5e", "#a78bfa", "#34d399"];
  const toolStats = useMemo(() => {
    const map = {};
    for (const l of store.auditLog) {
      map[l.tool] = map[l.tool] || { total: 0, success: 0 };
      map[l.tool].total += 1;
      if (l.success) map[l.tool].success += 1;
    }
    return Object.entries(map).map(([tool, v]) => ({ tool, rate: Math.round((v.success / v.total) * 100) }));
  }, [store.auditLog]);
  const recurring = topRecurring(store);

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-[13px] font-medium text-white mb-4">Incidents by Building</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byBuilding}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={22} />
              <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="incidents" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-[13px] font-medium text-white mb-4">Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-[13px] font-medium text-white mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-amber-300" /> Insights — Self-Learning &amp; Adaptation</h3>
        <div className="grid grid-cols-2 gap-3">
          {recurring.map((r) => (
            <div key={r.roomId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12.5px] font-medium text-white">{r.roomLabel}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.confidence === "HIGH" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>{r.confidence} CONFIDENCE</span>
              </div>
              <div className="text-[11px] text-slate-500 mb-2">{r.type} · {r.count} incidents in 30 days</div>
              {r.confidence === "HIGH" && (
                <p className="text-[11px] text-slate-400 italic">AI recommendation: repeated reactive repairs suggest this unit needs preventive maintenance rather than continued point fixes.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-[13px] font-medium text-white mb-4">Tool Success Rate</h3>
        <div className="space-y-2">
          {toolStats.map((t) => (
            <div key={t.tool} className="flex items-center gap-3">
              <span className="text-[11.5px] text-slate-400 font-mono w-52 shrink-0 truncate">{t.tool}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${t.rate}%` }} /></div>
              <span className="text-[11px] text-slate-500 w-10 text-right">{t.rate}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AUDIT LOG PAGE
// ---------------------------------------------------------------------------
function AuditLogPage({ store }) {
  return (
    <div className="p-6">
      <Card className="overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-slate-500 text-left">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Approval</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {store.auditLog.map((l) => (
              <tr key={l.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 font-mono text-slate-500">{fmtTime(l.ts)}</td>
                <td className="px-4 py-2.5 text-slate-300">{l.actor}</td>
                <td className="px-4 py-2.5 text-slate-300 font-mono">{l.tool}</td>
                <td className="px-4 py-2.5"><RiskBadge risk={l.risk} /></td>
                <td className="px-4 py-2.5 text-slate-400">{l.approval}</td>
                <td className="px-4 py-2.5 text-slate-400 max-w-[280px] truncate">{l.result}</td>
                <td className="px-4 py-2.5 text-slate-500">{l.durationMs}ms</td>
                <td className="px-4 py-2.5">
                  {l.success === true && <CheckCircle2 size={14} className="text-emerald-400" />}
                  {l.success === false && <XCircle size={14} className="text-rose-400" />}
                  {l.success === null && <Loader2 size={14} className="text-amber-400" />}
                </td>
              </tr>
            ))}
            {store.auditLog.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-600">No actions logged yet. Run a demo scenario from the Agent page.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
