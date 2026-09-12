#!/usr/bin/env python3
"""
CampusOps — Autonomous AI for Real-World Campus Operations
============================================================
Python port of the original React/JSX single-file demo application.

The original was a browser UI (Tailwind CSS + lucide-react icons +
Recharts graphs) wrapped around an in-memory "agent" simulation: seed
data for a campus, a tool registry + policy engine that decides whether
an action auto-executes / needs human approval / is denied outright,
a set of scripted incident-response "demos", and a full audit trail.

Python has no drop-in equivalent for Tailwind/Recharts, so this port
keeps ALL of the state, business logic, the tool/policy engine, the
demo scripts and the human-approval workflow 1:1, and replaces the
visual dashboard/analytics pages with an interactive text CLI (plain
tables and simple ASCII bars instead of SVG charts).

BUGS FOUND IN THE ORIGINAL AND FIXED HERE
------------------------------------------
1. `latestTicketId()` reached into a global `window` object
   (`window.__campusops_last_ticket_id`) to smuggle the id of a
   just-created ticket out of `runToolLogic`. That's a race-condition-
   prone global mutable variable that doesn't even exist outside a
   browser. Fixed: `create_maintenance_ticket` now returns `ticket_id`
   in its result dict, and the demo runner reads it off the previous
   step's result (stored per-run in `runner["last_ticket_id"]`) — no
   shared/global state involved.

2. `startDemo()` set a run-lock flag (`runLockRef.current = true`)
   before running the script but never released it in a `finally`
   block, so a single unhandled exception mid-run would permanently
   wedge every "Run demo" button. Fixed: `start_demo()` releases the
   lock in a `finally` block.

3. `move_booking` and `cancel_booking` never freed the room a booking
   was moved/cancelled *out of* — it kept whatever status it already
   had (typically OCCUPIED) forever, even after the class using it had
   left. Fixed: both tools now flip the vacated room back to AVAILABLE,
   unless it's actually broken (MAINTENANCE/CRITICAL).

4. `assign_technician` marks a technician unavailable but nothing ever
   made them available again — after one incident of a given specialty,
   that whole specialty was permanently out of technicians for the rest
   of the session. Fixed: resolving a ticket (`update_maintenance_ticket`
   with `patch={"status": "resolved"}`) now frees the assigned tech.

5. The CRITICAL-risk ("privileged") approval branch of `execTool` never
   attached a `runId` to the approval it created (unlike the ordinary
   `require_approval` branch, which does). That meant approving a
   privileged action executed the tool, but the originating agent run
   could never resume/complete afterward — it would stay stuck on
   "running" forever if any steps followed it. Fixed: privileged
   approvals now carry `runId` too, and resuming after approval matches
   steps in either `awaiting_approval` or `blocked` state.

6. `IncidentDetail`'s "related audit log entries" used a fragile
   substring match (`JSON.stringify(args).includes(roomId)`), which can
   false-positive (room "sjt-304" matching a logged id like "sjt-3041")
   or miss things depending on key ordering. Fixed: `related_log_entries()`
   below checks the actual `args` dict values for an exact match instead
   of doing string search over serialized JSON.

Everything else (seed data, tool semantics, policy thresholds, demo
scripts, wording of summaries) is preserved as written in the original.
"""

from __future__ import annotations

import random
import time
import uuid

# ---------------------------------------------------------------------------
# SMALL HELPERS
# ---------------------------------------------------------------------------

# Set to 0 for an instant (non-interactive/scripted) run; a small nonzero
# value reproduces the "live" feel of the original's staggered setTimeouts.
STEP_DELAY = 0.12


def now_ms() -> float:
    return time.time() * 1000.0


def uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6]}"


def fmt_time(ts_ms: float) -> str:
    return time.strftime("%H:%M:%S", time.localtime(ts_ms / 1000.0))


def fmt_datetime(ts_ms: float) -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts_ms / 1000.0))


def fmt_mins_from_now(ts_ms: float) -> str:
    mins = round((ts_ms - now_ms()) / 60000.0)
    if mins < 0:
        return f"started {abs(mins)}m ago"
    if mins == 0:
        return "starting now"
    return f"in {mins}m"


def days_ago(d: float) -> float:
    return now_ms() - d * 86400000.0


def find(items, **kw):
    for item in items:
        if all(item.get(k) == v for k, v in kw.items()):
            return item
    return None


# ---------------------------------------------------------------------------
# SEED DATA
# ---------------------------------------------------------------------------
def make_seed() -> dict:
    buildings = [
        {"id": "bt", "name": "Tech Tower", "floors": 6},
        {"id": "sjt", "name": "SJT", "floors": 5},
        {"id": "ab1", "name": "AB1", "floors": 4},
        {"id": "ab2", "name": "AB2", "floors": 4},
        {"id": "lib", "name": "Library", "floors": 3},
        {"id": "mb", "name": "Main Block", "floors": 4},
    ]

    rooms = [
        {"id": "sjt-304", "buildingId": "sjt", "number": "304", "capacity": 60, "hasAC": True, "hasProjector": True, "status": "OCCUPIED"},
        {"id": "sjt-401", "buildingId": "sjt", "number": "401", "capacity": 55, "hasAC": True, "hasProjector": True, "status": "AVAILABLE"},
        {"id": "sjt-101", "buildingId": "sjt", "number": "101", "capacity": 90, "hasAC": True, "hasProjector": True, "status": "AVAILABLE"},
        {"id": "sjt-203", "buildingId": "sjt", "number": "203", "capacity": 40, "hasAC": False, "hasProjector": True, "status": "AVAILABLE"},
        {"id": "ab2-203", "buildingId": "ab2", "number": "203", "capacity": 45, "hasAC": True, "hasProjector": True, "status": "OCCUPIED"},
        {"id": "ab2-210", "buildingId": "ab2", "number": "210", "capacity": 45, "hasAC": True, "hasProjector": True, "status": "AVAILABLE"},
        {"id": "ab2-105", "buildingId": "ab2", "number": "105", "capacity": 70, "hasAC": True, "hasProjector": False, "status": "AVAILABLE"},
        {"id": "ab1-102", "buildingId": "ab1", "number": "102", "capacity": 50, "hasAC": True, "hasProjector": True, "status": "AVAILABLE"},
        {"id": "ab1-201", "buildingId": "ab1", "number": "201", "capacity": 50, "hasAC": True, "hasProjector": True, "status": "RESERVED"},
        {"id": "bt-501", "buildingId": "bt", "number": "501", "capacity": 30, "hasAC": True, "hasProjector": True, "status": "OCCUPIED", "network": "down"},
        {"id": "bt-502", "buildingId": "bt", "number": "502", "capacity": 30, "hasAC": True, "hasProjector": True, "status": "OCCUPIED", "network": "down"},
        {"id": "bt-503", "buildingId": "bt", "number": "503", "capacity": 30, "hasAC": True, "hasProjector": True, "status": "OCCUPIED", "network": "down"},
        {"id": "bt-power", "buildingId": "bt", "number": "Main Power Room", "capacity": 0, "hasAC": False, "hasProjector": False, "status": "CRITICAL", "infra": True},
        {"id": "lib-b1", "buildingId": "lib", "number": "Basement Study Hall", "capacity": 120, "hasAC": True, "hasProjector": False, "status": "AVAILABLE"},
        {"id": "mb-110", "buildingId": "mb", "number": "110", "capacity": 65, "hasAC": True, "hasProjector": True, "status": "AVAILABLE"},
    ]

    technicians = [
        {"id": "t1", "name": "R. Muthukumar", "specialty": "HVAC", "available": True},
        {"id": "t2", "name": "S. Priyanka", "specialty": "Electrical", "available": True},
        {"id": "t3", "name": "A. Fernandes", "specialty": "Network/IT", "available": True},
        {"id": "t4", "name": "K. Bala", "specialty": "AV/Projector", "available": False},
    ]

    now = now_ms()
    bookings = [
        {"id": "bk1", "roomId": "sjt-304", "course": "PHY201 — Physics Lab", "faculty": "Dr. Rangan", "start": now + 12 * 60000, "end": now + 132 * 60000, "students": 42},
        {"id": "bk2", "roomId": "ab2-203", "course": "CSE310 — Systems Design", "faculty": "Dr. Iyer", "start": now + 15 * 60000, "end": now + 105 * 60000, "students": 38},
        {"id": "bk3", "roomId": "bt-501", "course": "ECE220 — Signals Lab", "faculty": "Dr. Naidu", "start": now - 10 * 60000, "end": now + 50 * 60000, "students": 28},
        {"id": "bk4", "roomId": "bt-502", "course": "CSE110 — Intro Programming", "faculty": "Dr. Suresh", "start": now - 5 * 60000, "end": now + 55 * 60000, "students": 55},
        {"id": "bk5", "roomId": "bt-503", "course": "MEC140 — CAD Tutorial", "faculty": "Dr. Rekha", "start": now, "end": now + 60 * 60000, "students": 24},
        {"id": "bk6", "roomId": "sjt-401", "course": "—", "faculty": "—", "start": now + 240 * 60000, "end": now + 300 * 60000, "students": 0},
    ]

    maintenance_tickets = [
        {"id": "mt-101", "roomId": "sjt-304", "issue": "HVAC compressor fault", "priority": "high", "status": "resolved", "technicianId": "t1", "createdAt": days_ago(28)},
        {"id": "mt-102", "roomId": "sjt-304", "issue": "AC unit not cooling", "priority": "medium", "status": "resolved", "technicianId": "t1", "createdAt": days_ago(23)},
        {"id": "mt-103", "roomId": "sjt-304", "issue": "HVAC thermostat unresponsive", "priority": "medium", "status": "resolved", "technicianId": "t1", "createdAt": days_ago(19)},
        {"id": "mt-104", "roomId": "sjt-304", "issue": "AC unit not cooling", "priority": "high", "status": "resolved", "technicianId": "t1", "createdAt": days_ago(14)},
        {"id": "mt-105", "roomId": "sjt-304", "issue": "HVAC compressor fault", "priority": "high", "status": "resolved", "technicianId": "t1", "createdAt": days_ago(9)},
        {"id": "mt-106", "roomId": "sjt-304", "issue": "AC unit not cooling", "priority": "medium", "status": "resolved", "technicianId": "t1", "createdAt": days_ago(4)},
        {"id": "mt-201", "roomId": "ab2-203", "issue": "Projector lamp failure", "priority": "medium", "status": "resolved", "technicianId": "t4", "createdAt": days_ago(31)},
        {"id": "mt-202", "roomId": "ab2-203", "issue": "Projector no signal", "priority": "medium", "status": "resolved", "technicianId": "t4", "createdAt": days_ago(6)},
        {"id": "mt-301", "roomId": "bt-501", "issue": "Network switch failure", "priority": "high", "status": "resolved", "technicianId": "t3", "createdAt": days_ago(17)},
        {"id": "mt-401", "roomId": "ab1-102", "issue": "Flickering lights", "priority": "low", "status": "resolved", "technicianId": "t2", "createdAt": days_ago(40)},
    ]

    incidents = [
        {"id": "inc-9001", "title": "Projector recurring failure — AB2-203", "buildingId": "ab2", "roomId": "ab2-203", "severity": "medium", "status": "monitoring", "createdAt": days_ago(6), "assignedTechnicianId": "t4", "aiConfidence": 0.71},
        {"id": "inc-9002", "title": "Network switch outage — Tech Tower", "buildingId": "bt", "roomId": None, "severity": "high", "status": "open", "createdAt": days_ago(0.02), "assignedTechnicianId": None, "aiConfidence": 0.0},
    ]

    policies = [
        {"id": "p1", "name": "Room-status & schedule reads", "risk": "LOW", "rule": "Auto-execute. No approval needed."},
        {"id": "p2", "name": "Create maintenance ticket", "risk": "LOW", "rule": "Auto-execute. Logged to audit trail."},
        {"id": "p3", "name": "Notify affected students/faculty (<100 recipients)", "risk": "LOW", "rule": "Auto-execute."},
        {"id": "p4", "name": "Assign technician", "risk": "MEDIUM", "rule": "Auto-execute if technician is available and matches specialty; else escalate."},
        {"id": "p5", "name": "Move an active booking to another room", "risk": "MEDIUM", "rule": "Displaces students/faculty already underway — always requires human approval."},
        {"id": "p6", "name": "Cancel a booking outright", "risk": "HIGH", "rule": "Requires human approval. Never automatic."},
        {"id": "p7", "name": "Spend budget / order replacement equipment", "risk": "HIGH", "rule": "Requires human approval with named approver."},
        {"id": "p8", "name": "Shut down building infrastructure (power, mains)", "risk": "CRITICAL", "rule": "Never auto-executed. Requires privileged, explicit dual confirmation."},
        {"id": "p9", "name": "Delete records / irreversible data changes", "risk": "CRITICAL", "rule": "Denied by default. Not permitted from the agent under any circumstance."},
    ]

    return {
        "buildings": buildings,
        "rooms": rooms,
        "technicians": technicians,
        "bookings": bookings,
        "maintenanceTickets": maintenance_tickets,
        "incidents": incidents,
        "notifications": [],
        "auditLog": [],
        "approvals": [],
        "policies": policies,
        "idSeq": 9003,
        "ticketSeq": 500,
        "notifSeq": 1,
        "approvalSeq": 1,
        "logSeq": 1,
    }


# ---------------------------------------------------------------------------
# TOOL REGISTRY + POLICY ENGINE
#
# Every tool declares a risk level. The policy engine decides whether a call
# executes immediately, needs approval, or is denied outright. Everything
# routes through here, and every call is written to the audit log.
# ---------------------------------------------------------------------------
TOOLS = {
    "get_room_status": {"risk": "LOW", "label": "Check room status"},
    "get_room_schedule": {"risk": "LOW", "label": "Check room schedule"},
    "get_building_status": {"risk": "LOW", "label": "Check building status"},
    "get_maintenance_history": {"risk": "LOW", "label": "Review maintenance history"},
    "get_incident_history": {"risk": "LOW", "label": "Review incident history"},
    "detect_recurring_issue": {"risk": "LOW", "label": "Analyze recurrence pattern"},
    "get_system_policies": {"risk": "LOW", "label": "Read applicable policy"},
    "create_maintenance_ticket": {"risk": "LOW", "label": "Create maintenance ticket"},
    "find_available_room": {"risk": "LOW", "label": "Search for available room"},
    "send_notification": {"risk": "LOW", "label": "Notify affected users"},
    "assign_technician": {"risk": "MEDIUM", "label": "Assign technician"},
    "update_maintenance_ticket": {"risk": "MEDIUM", "label": "Update maintenance ticket"},
    "move_booking": {"risk": "MEDIUM", "label": "Move booking to another room", "alwaysApprove": True},
    "cancel_booking": {"risk": "HIGH", "label": "Cancel booking"},
    "spend_budget": {"risk": "HIGH", "label": "Approve equipment spend"},
    "shutdown_building_power": {"risk": "CRITICAL", "label": "Shut down building power", "neverAuto": True},
    "delete_records": {"risk": "CRITICAL", "label": "Delete records", "neverAuto": True},
}


def decide_policy(tool_name: str) -> dict:
    t = TOOLS[tool_name]
    if t.get("neverAuto") or t["risk"] == "CRITICAL":
        return {"action": "deny_auto_requires_privileged", "risk": t["risk"]}
    if t["risk"] == "HIGH":
        return {"action": "require_approval", "risk": t["risk"]}
    if t["risk"] == "MEDIUM":
        return {"action": "require_approval" if t.get("alwaysApprove") else "auto", "risk": t["risk"]}
    return {"action": "auto", "risk": t["risk"]}


# ---------------------------------------------------------------------------
# TOOL EXECUTION LOGIC — the only place state actually mutates
# ---------------------------------------------------------------------------
def run_tool_logic(tool_name: str, args: dict, store: dict) -> dict:
    """Mutates `store` in place and returns {"summary": ..., "data": ...}."""

    if tool_name == "get_room_status":
        room = find(store["rooms"], id=args.get("roomId"))
        fault = "network outage" if room and room.get("network") == "down" else args.get("fault")
        number = room["number"] if room else "?"
        status = room["status"] if room else "UNKNOWN"
        summary = f"Room {number}: status {status}" + (f", fault detected — {fault}." if fault else ".")
        return {"summary": summary, "data": room}

    if tool_name == "get_room_schedule":
        b = [bk for bk in store["bookings"] if bk["roomId"] == args.get("roomId")]
        if b:
            summary = f"Found {len(b)} booking(s) — next: {b[0]['course']} ({fmt_mins_from_now(b[0]['start'])})."
        else:
            summary = "No active bookings found."
        return {"summary": summary, "data": b}

    if tool_name == "get_building_status":
        rooms = [r for r in store["rooms"] if r["buildingId"] == args.get("buildingId")]
        affected = [r for r in rooms if r.get("network") == "down"]
        summary = f"{len(rooms)} rooms surveyed — {len(affected)} reporting network outage."
        return {"summary": summary, "data": rooms}

    if tool_name == "get_maintenance_history":
        hist = [m for m in store["maintenanceTickets"] if m["roomId"] == args.get("roomId")]
        summary = f"{len(hist)} prior maintenance record(s) found for this room in the last 30 days."
        return {"summary": summary, "data": hist}

    if tool_name == "get_incident_history":
        return {"summary": f"{len(store['incidents'])} incidents on record.", "data": store["incidents"]}

    if tool_name == "detect_recurring_issue":
        hist = [m for m in store["maintenanceTickets"] if m["roomId"] == args.get("roomId")]
        count = len(hist)
        confidence = "HIGH" if count >= 4 else "MEDIUM" if count >= 2 else "LOW"
        if count >= 3:
            summary = (f"Recurring issue detected: {count} incidents in 30 days "
                       f"({confidence} confidence). Preventive maintenance recommended.")
        else:
            summary = f"No strong recurrence pattern ({count} prior incident(s))."
        return {"summary": summary, "data": {"count": count, "confidence": confidence}}

    if tool_name == "get_system_policies":
        return {"summary": "Policy engine consulted — action risk levels confirmed.", "data": store["policies"]}

    if tool_name == "create_maintenance_ticket":
        ticket_id = f"mt-{store['ticketSeq']}"
        store["ticketSeq"] += 1
        store["maintenanceTickets"].insert(0, {
            "id": ticket_id, "roomId": args["roomId"], "issue": args["issue"],
            "priority": args["priority"], "status": "open", "technicianId": None,
            "createdAt": now_ms(),
        })
        if args["priority"] in ("critical", "high"):
            room = find(store["rooms"], id=args["roomId"])
            if room:
                room["status"] = "MAINTENANCE"
        # BUG FIX #1: return the id instead of stashing it on a global.
        return {"summary": f"Ticket {ticket_id} created — priority {args['priority'].upper()}.",
                "ticket_id": ticket_id}

    if tool_name == "update_maintenance_ticket":
        ticket = find(store["maintenanceTickets"], id=args["ticketId"])
        if ticket:
            ticket.update(args.get("patch", {}))
            # BUG FIX #4: free the technician once their ticket resolves.
            if ticket.get("status") == "resolved" and ticket.get("technicianId"):
                tech = find(store["technicians"], id=ticket["technicianId"])
                if tech:
                    tech["available"] = True
        return {"summary": f"Ticket {args['ticketId']} updated."}

    if tool_name == "assign_technician":
        tech = find(store["technicians"], specialty=args["specialty"], available=True)
        if not tech:
            return {"summary": f"No available {args['specialty']} technician — escalating to on-call roster."}
        tech["available"] = False
        ticket = find(store["maintenanceTickets"], id=args["ticketId"])
        if ticket:
            ticket["technicianId"] = tech["id"]
            ticket["status"] = "assigned"
        return {"summary": f"{tech['name']} ({tech['specialty']}) assigned to ticket {args['ticketId']}."}

    if tool_name == "find_available_room":
        candidates = [
            r for r in store["rooms"]
            if r["status"] == "AVAILABLE"
            and r["capacity"] >= args.get("minCapacity", 0)
            and (not args.get("requireProjector") or r["hasProjector"])
            and r["id"] != args.get("excludeRoomId")
        ]
        candidates.sort(key=lambda r: r["capacity"])
        pick = candidates[0] if candidates else None
        summary = (f"Room {pick['number']} available (capacity {pick['capacity']}) — nearest match."
                   if pick else "No suitable alternative room found.")
        return {"summary": summary, "data": pick}

    if tool_name == "move_booking":
        booking = find(store["bookings"], id=args["bookingId"])
        if booking:
            booking["roomId"] = args["toRoomId"]
        to_room = find(store["rooms"], id=args["toRoomId"])
        if to_room:
            to_room["status"] = "OCCUPIED"
        # BUG FIX #3: free the vacated room instead of leaving it untouched.
        from_room = find(store["rooms"], id=args["fromRoomId"])
        if from_room and from_room["status"] not in ("MAINTENANCE", "CRITICAL"):
            from_room["status"] = "AVAILABLE"
        return {"summary": f"Booking moved to Room {args['toRoomNumber']}."}

    if tool_name == "cancel_booking":
        booking = find(store["bookings"], id=args["bookingId"])
        store["bookings"] = [b for b in store["bookings"] if b["id"] != args["bookingId"]]
        # BUG FIX #3 (same class of bug): free the room the cancelled booking held.
        if booking:
            room = find(store["rooms"], id=booking["roomId"])
            if room and room["status"] not in ("MAINTENANCE", "CRITICAL"):
                room["status"] = "AVAILABLE"
        return {"summary": f"Booking {args['bookingId']} cancelled."}

    if tool_name == "send_notification":
        nid = f"n-{store['notifSeq']}"
        store["notifSeq"] += 1
        store["notifications"].insert(0, {
            "id": nid, "message": args["message"], "recipients": args["recipients"], "ts": now_ms(),
        })
        return {"summary": f"{args['recipients']} user(s) notified: \"{args['message']}\""}

    if tool_name == "shutdown_building_power":
        for r in store["rooms"]:
            if r["buildingId"] == args["buildingId"]:
                r["status"] = "MAINTENANCE"
        return {"summary": (f"Privileged override executed — power isolated for "
                             f"{args['buildingId'].upper()}. This required dual human authorization.")}

    return {"summary": "No-op."}


# ---------------------------------------------------------------------------
# DEMO SCRIPTS — deterministic, chained tool sequences (the "wow" flows)
# Each step's `args` is a function of the current `runner` dict so later
# steps can reference the outcome of earlier ones (e.g. a freshly created
# ticket id) — see BUG FIX #1 above for how that's threaded through now.
# ---------------------------------------------------------------------------
def _last_ticket(runner: dict) -> str:
    return runner.get("last_ticket_id") or "the new ticket"


DEMO_SCRIPTS = {
    "ac": lambda store: {
        "title": "Room 304 AC Failure",
        "incidentSeed": {"title": "Room 304 AC Failure — Physics Lab imminent", "buildingId": "sjt", "roomId": "sjt-304", "severity": "critical"},
        "steps": [
            {"tool": "get_room_status", "reason": "Investigating reported fault",
             "args": lambda r: {"roomId": "sjt-304", "fault": "AC compressor fault, ambient temp 34°C"}},
            {"tool": "get_room_schedule", "reason": "Checking what's affected",
             "args": lambda r: {"roomId": "sjt-304"}},
            {"tool": "get_maintenance_history", "reason": "Checking for prior related failures",
             "args": lambda r: {"roomId": "sjt-304"}},
            {"tool": "create_maintenance_ticket", "reason": "Fault confirmed — logging repair request",
             "args": lambda r: {"roomId": "sjt-304", "issue": "AC compressor fault", "priority": "critical"}},
            {"tool": "assign_technician", "reason": "Routing to HVAC specialist",
             "args": lambda r: {"ticketId": _last_ticket(r), "specialty": "HVAC"}},
            {"tool": "find_available_room", "reason": "Physics Lab starts in 12 minutes — sourcing an alternative",
             "args": lambda r: {"minCapacity": 42, "requireProjector": True, "excludeRoomId": "sjt-304"}},
            {"tool": "move_booking", "reason": "Relocating the Physics Lab before class start — displaces an active booking, requires approval",
             "args": lambda r: {"bookingId": "bk1", "fromRoomId": "sjt-304", "toRoomId": "sjt-401", "toRoomNumber": "401"}},
            {"tool": "send_notification", "reason": "Informing affected students and faculty",
             "args": lambda r: {"message": "PHY201 Physics Lab has moved to Room 401 due to an AC fault in 304.", "recipients": 42}},
            {"tool": "detect_recurring_issue", "reason": "Checking whether this is a one-off or a pattern",
             "args": lambda r: {"roomId": "sjt-304"}},
        ],
    },
    "projector": lambda store: {
        "title": "AB2-203 Projector Failure",
        "incidentSeed": {"title": "Projector failure — AB2-203, class in 15 min", "buildingId": "ab2", "roomId": "ab2-203", "severity": "medium"},
        "steps": [
            {"tool": "get_room_status", "reason": "Investigating reported fault",
             "args": lambda r: {"roomId": "ab2-203", "fault": "no signal from projector unit"}},
            {"tool": "get_room_schedule", "reason": "Checking what's affected",
             "args": lambda r: {"roomId": "ab2-203"}},
            {"tool": "get_maintenance_history", "reason": "Checking for prior related failures",
             "args": lambda r: {"roomId": "ab2-203"}},
            {"tool": "create_maintenance_ticket", "reason": "Logging repair request",
             "args": lambda r: {"roomId": "ab2-203", "issue": "Projector — no signal", "priority": "medium"}},
            {"tool": "assign_technician", "reason": "Routing to AV specialist",
             "args": lambda r: {"ticketId": _last_ticket(r), "specialty": "AV/Projector"}},
            {"tool": "send_notification", "reason": "Giving faculty a heads-up before class starts",
             "args": lambda r: {"message": "AB2-203 projector is down; a technician is en route. Class will proceed with the whiteboard in the interim.", "recipients": 38}},
            {"tool": "detect_recurring_issue", "reason": "Checking whether this is a pattern",
             "args": lambda r: {"roomId": "ab2-203"}},
        ],
    },
    "network": lambda store: {
        "title": "Tech Tower Network Outage",
        "incidentSeed": {"title": "Network outage — Tech Tower, 3 classes affected", "buildingId": "bt", "roomId": None, "severity": "high"},
        "steps": [
            {"tool": "get_building_status", "reason": "Surveying the building for scope of the outage",
             "args": lambda r: {"buildingId": "bt"}},
            {"tool": "get_maintenance_history", "reason": "Checking prior network incidents",
             "args": lambda r: {"roomId": "bt-501"}},
            {"tool": "create_maintenance_ticket", "reason": "Logging a building-wide network fault",
             "args": lambda r: {"roomId": "bt-501", "issue": "Core switch failure — 3 rooms affected", "priority": "high"}},
            {"tool": "assign_technician", "reason": "Routing to network/IT specialist",
             "args": lambda r: {"ticketId": _last_ticket(r), "specialty": "Network/IT"}},
            {"tool": "send_notification", "reason": "Notifying all affected classes",
             "args": lambda r: {"message": "Network is down across Tech Tower (rooms 501-503). IT is on site; online tools may be unavailable.", "recipients": 107}},
            {"tool": "detect_recurring_issue", "reason": "Checking whether this building has a pattern of outages",
             "args": lambda r: {"roomId": "bt-501"}},
        ],
    },
    "shutdown": lambda store: {
        "title": "Shut Down Building Main Power",
        "incidentSeed": None,
        "steps": [
            {"tool": "get_system_policies", "reason": "Checking whether this action is permitted",
             "args": lambda r: {}},
            {"tool": "shutdown_building_power", "reason": "User requested a full building power shutdown — CRITICAL risk, evaluating against policy",
             "args": lambda r: {"buildingId": "bt", "affected": "All of Tech Tower — power, lighting, HVAC, network"}},
        ],
    },
}


# ---------------------------------------------------------------------------
# THE APP — mirrors the React component's state + callbacks
# ---------------------------------------------------------------------------
class CampusOpsApp:
    def __init__(self):
        self.store = make_seed()
        self.agent_runs: list[dict] = []
        self.active_run_id: str | None = None
        self.live_feed: list[dict] = []
        self.run_lock = False
        self.runners: dict[str, dict] = {}

    # -- small state helpers -------------------------------------------------
    def push_live(self, msg: str) -> None:
        self.live_feed.insert(0, {"id": uid("live"), "msg": msg, "ts": now_ms()})
        del self.live_feed[12:]

    def append_log(self, entry: dict) -> None:
        s = self.store
        s["auditLog"].insert(0, {"id": f"log-{s['logSeq']}", "ts": now_ms(), **entry})
        s["logSeq"] += 1

    def find_run(self, run_id: str) -> dict | None:
        return find(self.agent_runs, id=run_id)

    # -- tool execution, gated by policy -------------------------------------
    def exec_tool(self, tool_name: str, args: dict, reason: str, run_id: str | None) -> dict:
        policy = decide_policy(tool_name)
        started = now_ms()

        def add_step(patch: dict) -> None:
            run = self.find_run(run_id) if run_id else None
            if run is not None:
                run["steps"].append({
                    "id": uid("step"), "tool": tool_name, "args": args, "reason": reason,
                    "risk": policy["risk"], "ts": now_ms(), **patch,
                })

        if policy["action"] == "deny_auto_requires_privileged":
            self.append_log({"actor": "AI Agent", "tool": tool_name, "args": args, "risk": policy["risk"],
                              "approval": "BLOCKED", "result": "Denied — critical action requires privileged human authorization",
                              "success": False, "durationMs": 4})
            add_step({"status": "blocked", "result": "Blocked by policy engine: this action is CRITICAL risk and cannot be auto-executed."})
            self.push_live(f"Blocked CRITICAL action: {TOOLS[tool_name]['label']}")
            approval_id = uid("appr")
            self.store["approvalSeq"] += 1
            self.store["approvals"].insert(0, {
                "id": approval_id, "tool": tool_name, "args": args, "reason": reason, "risk": policy["risk"],
                "status": "pending", "privileged": True, "createdAt": now_ms(),
                "affected": args.get("affected", "Building-wide infrastructure"),
                "runId": run_id,  # BUG FIX #5: original omitted this, stranding the run.
            })
            return {"status": "blocked", "approval_id": approval_id}

        if policy["action"] == "require_approval":
            self.append_log({"actor": "AI Agent", "tool": tool_name, "args": args, "risk": policy["risk"],
                              "approval": "PENDING", "result": "Awaiting human approval", "success": None, "durationMs": 3})
            add_step({"status": "awaiting_approval", "result": "Paused — awaiting human approval."})
            self.push_live(f"Approval required: {TOOLS[tool_name]['label']}")
            approval_id = uid("appr")
            self.store["approvalSeq"] += 1
            self.store["approvals"].insert(0, {
                "id": approval_id, "tool": tool_name, "args": args, "reason": reason, "risk": policy["risk"],
                "status": "pending", "privileged": False, "createdAt": now_ms(), "runId": run_id,
                "affected": args.get("affected", "—"),
            })
            return {"status": "awaiting_approval", "approval_id": approval_id}

        # AUTO-EXECUTE
        time.sleep(STEP_DELAY)
        result = run_tool_logic(tool_name, args, self.store)
        duration = now_ms() - started
        self.append_log({"actor": "AI Agent", "tool": tool_name, "args": args, "risk": policy["risk"],
                          "approval": "N/A", "result": result["summary"], "success": True, "durationMs": duration})
        add_step({"status": "done", "result": result["summary"]})
        self.push_live(result["summary"])
        # BUG FIX #1: thread the new ticket id back to the runner (instead of a global).
        if run_id and "ticket_id" in result:
            runner = self.runners.get(run_id)
            if runner is not None:
                runner["last_ticket_id"] = result["ticket_id"]
        return {"status": "done", "result": result}

    # -- human-in-the-loop approvals ------------------------------------------
    def resolve_approval(self, approval_id: str, decision: str, privileged_confirmed: bool = False) -> tuple[bool, str]:
        approval = find(self.store["approvals"], id=approval_id)
        if not approval:
            return False, "No such approval."
        if approval["status"] != "pending":
            return False, f"Approval already {approval['status']}."
        if approval.get("privileged") and decision == "approve" and not privileged_confirmed:
            return False, "Privileged (CRITICAL) action needs an explicit second confirmation."

        approval["status"] = "approved" if decision == "approve" else "denied"
        approval["resolvedAt"] = now_ms()
        self.append_log({
            "actor": "Human Reviewer", "tool": approval["tool"], "args": approval["args"], "risk": approval["risk"],
            "approval": "APPROVED" if decision == "approve" else "DENIED",
            "result": "Human approved — executing" if decision == "approve" else "Human denied the action",
            "success": decision == "approve", "durationMs": 0,
        })

        run_id = approval.get("runId")
        if decision == "deny":
            self.push_live(f"Denied: {TOOLS[approval['tool']]['label']}")
            run = self.find_run(run_id) if run_id else None
            if run is not None:
                for st in run["steps"]:
                    if st["tool"] == approval["tool"] and st["status"] in ("awaiting_approval", "blocked"):
                        st["status"] = "denied"
                        st["result"] = "Denied by human reviewer. Agent will not proceed with this action."
                run["status"] = "completed_with_denial"
            return True, "Denied."

        # Approved -> actually execute now
        time.sleep(STEP_DELAY)
        result = run_tool_logic(approval["tool"], approval["args"], self.store)
        self.append_log({"actor": "AI Agent", "tool": approval["tool"], "args": approval["args"], "risk": approval["risk"],
                          "approval": "EXECUTED", "result": result["summary"], "success": True, "durationMs": 480})
        self.push_live(result["summary"])
        if run_id and "ticket_id" in result:
            runner = self.runners.get(run_id)
            if runner is not None:
                runner["last_ticket_id"] = result["ticket_id"]
        run = self.find_run(run_id) if run_id else None
        if run is not None:
            for st in run["steps"]:
                if st["tool"] == approval["tool"] and st["status"] in ("awaiting_approval", "blocked"):
                    st["status"] = "done"
                    st["result"] = result["summary"]
            self.resume_run(run_id)
        return True, result["summary"]

    # -- scripted demo runner --------------------------------------------------
    def start_demo(self, demo_key: str) -> str | None:
        if self.run_lock:
            return None
        self.run_lock = True
        try:
            script = DEMO_SCRIPTS[demo_key](self.store)
            run_id = uid("run")
            self.agent_runs.insert(0, {
                "id": run_id, "title": script["title"], "incidentSeed": script["incidentSeed"],
                "steps": [], "status": "running",
            })
            self.active_run_id = run_id

            incident_id = None
            if script["incidentSeed"]:
                incident_id = uid("inc")
                self.store["incidents"].insert(0, {
                    "id": incident_id, **script["incidentSeed"],
                    "status": "open", "createdAt": now_ms(), "aiConfidence": 0,
                })

            self.runners[run_id] = {"steps": script["steps"], "idx": 0, "incident_id": incident_id, "last_ticket_id": None}
            self.advance_run(run_id)
            return run_id
        finally:
            # BUG FIX #2: original never released this lock on an exception.
            self.run_lock = False

    def advance_run(self, run_id: str) -> None:
        runner = self.runners.get(run_id)
        if not runner:
            return
        while runner["idx"] < len(runner["steps"]):
            step = runner["steps"][runner["idx"]]
            runner["idx"] += 1
            time.sleep(STEP_DELAY)
            args = step["args"](runner)
            outcome = self.exec_tool(step["tool"], args, step["reason"], run_id)
            if outcome["status"] in ("awaiting_approval", "blocked"):
                return  # pause — resumes via resolve_approval -> resume_run
        run = self.find_run(run_id)
        if run is not None:
            run["status"] = "completed"
        if runner.get("incident_id"):
            inc = find(self.store["incidents"], id=runner["incident_id"])
            if inc is not None:
                inc["status"] = "resolved"
                inc["aiConfidence"] = 0.93

    def resume_run(self, run_id: str) -> None:
        self.advance_run(run_id)

    def reset_demo(self) -> None:
        self.store = make_seed()
        self.agent_runs = []
        self.active_run_id = None
        self.live_feed = []
        self.runners = {}
        self.run_lock = False

    # -- free-text agent command (keyword-routed deterministic planner) -----
    def submit_command(self, text: str) -> str | None:
        t = text.lower()
        if "304" in t or ("ac" in t and "fail" in t):
            return self.start_demo("ac")
        if "projector" in t or "ab2" in t:
            return self.start_demo("projector")
        if "network" in t or "tech tower" in t or "outage" in t:
            return self.start_demo("network")
        if "power" in t or "shut" in t:
            return self.start_demo("shutdown")
        # generic fallback: run a light triage demo
        return self.start_demo("ac")

    @property
    def pending_approvals(self) -> list[dict]:
        return [a for a in self.store["approvals"] if a["status"] == "pending"]


# ---------------------------------------------------------------------------
# ANALYTICS / DASHBOARD HELPERS (replace the Recharts widgets with data)
# ---------------------------------------------------------------------------
def top_recurring(store: dict, limit: int = 4) -> list[dict]:
    by_room: dict[str, dict] = {}
    for m in store["maintenanceTickets"]:
        entry = by_room.setdefault(m["roomId"], {"count": 0, "type": m["issue"].split(" ")[0]})
        entry["count"] += 1
    out = []
    for room_id, v in by_room.items():
        room = find(store["rooms"], id=room_id)
        building = find(store["buildings"], id=room["buildingId"]) if room else None
        label = f"{building['name']} {room['number']}" if room and building else room_id
        confidence = "HIGH" if v["count"] >= 4 else "MEDIUM" if v["count"] >= 2 else "LOW"
        out.append({"roomId": room_id, "roomLabel": label, "type": v["type"], "count": v["count"], "confidence": confidence})
    out.sort(key=lambda r: r["count"], reverse=True)
    return out[:limit]


def incidents_by_building(store: dict) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for i in store["incidents"]:
        b = find(store["buildings"], id=i["buildingId"])
        name = b["name"] if b else i["buildingId"]
        counts[name] = counts.get(name, 0) + 1
    return sorted(counts.items(), key=lambda kv: kv[1], reverse=True)


def incidents_by_type(store: dict) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for m in store["maintenanceTickets"]:
        issue = m["issue"]
        if "HVAC" in issue or "AC" in issue:
            key = "HVAC"
        elif "Projector" in issue:
            key = "AV"
        elif "Network" in issue:
            key = "Network"
        elif "light" in issue:
            key = "Electrical"
        else:
            key = "Other"
        counts[key] = counts.get(key, 0) + 1
    return sorted(counts.items(), key=lambda kv: kv[1], reverse=True)


def tool_success_rates(store: dict) -> list[tuple[str, int]]:
    stats: dict[str, dict] = {}
    for entry in store["auditLog"]:
        s = stats.setdefault(entry["tool"], {"total": 0, "success": 0})
        s["total"] += 1
        if entry["success"]:
            s["success"] += 1
    return [(tool, round(100 * v["success"] / v["total"])) for tool, v in stats.items()]


def building_health(store: dict) -> list[tuple[str, int]]:
    out = []
    for b in store["buildings"]:
        rooms = [r for r in store["rooms"] if r["buildingId"] == b["id"]]
        issues = sum(1 for r in rooms if r["status"] in ("MAINTENANCE", "CRITICAL") or r.get("network") == "down")
        score = max(20, 100 - issues * 22)
        out.append((b["name"], score))
    return out


def related_log_entries(incident: dict, store: dict) -> list[dict]:
    """BUG FIX #6: exact match on args values instead of a substring search
    over JSON.stringify(args), which could false-positive/negative."""
    room_id = incident.get("roomId")
    building_id = incident.get("buildingId")
    out = []
    for entry in store["auditLog"]:
        args = entry.get("args") or {}
        if room_id and room_id in args.values():
            out.append(entry)
        elif building_id and not room_id and building_id in args.values():
            out.append(entry)
    return out


def ascii_bar(value: int, max_value: int, width: int = 24) -> str:
    if max_value <= 0:
        filled = 0
    else:
        filled = round(width * value / max_value)
    return "█" * filled + "·" * (width - filled)


# ---------------------------------------------------------------------------
# TEXT CLI
# ---------------------------------------------------------------------------
def header(title: str) -> None:
    print("\n" + "=" * 72)
    print(f" {title}")
    print("=" * 72)


def page_dashboard(app: CampusOpsApp) -> None:
    s = app.store
    header("Command Center")
    active_incidents = [i for i in s["incidents"] if i["status"] != "resolved"]
    critical = [i for i in active_incidents if i["severity"] == "critical"]
    open_tickets = [m for m in s["maintenanceTickets"] if m["status"] != "resolved"]
    done_logs = [l for l in s["auditLog"] if l["success"] is not None]
    success_rate = round(100 * sum(1 for l in done_logs if l["success"]) / len(done_logs)) if done_logs else 100

    print(f"Active Incidents:    {len(active_incidents)}")
    print(f"Critical Issues:     {len(critical)}")
    print(f"Pending Approvals:   {len(app.pending_approvals)}")
    print(f"Open Maintenance:    {len(open_tickets)}")
    print(f"Agent Success Rate:  {success_rate}%")

    print("\n-- Live Agent Activity " + "-" * 30)
    if not app.live_feed:
        print("No active agent runs. Trigger a scenario from the Agent page (option 3).")
    else:
        for f in app.live_feed:
            print(f"  [{fmt_time(f['ts'])}] {f['msg']}")

    print("\n-- Top Recurring Problems " + "-" * 27)
    for r in top_recurring(s):
        print(f"  {r['roomLabel']:<24} {r['type']:<10} {r['count']} incidents/30d  [{r['confidence']}]")

    print("\n-- Building Health " + "-" * 34)
    for name, score in building_health(s):
        print(f"  {name:<16} {ascii_bar(score, 100)} {score}%")

    print("\n-- Recent Incidents " + "-" * 33)
    for i in s["incidents"][:5]:
        print(f"  [{i['severity'].upper():<8}] {i['title']}  ({i['status']})")


def page_incidents(app: CampusOpsApp) -> None:
    s = app.store
    header("Incidents")
    for idx, i in enumerate(s["incidents"], 1):
        room = find(s["rooms"], id=i["roomId"]) if i["roomId"] else None
        building = find(s["buildings"], id=i["buildingId"])
        tech = find(s["technicians"], id=i.get("assignedTechnicianId"))
        print(f"{idx}. [{i['severity'].upper():<8}] {i['title']}")
        loc = building["name"] if building else "?"
        if room:
            loc += f" · {room['number']}"
        print(f"   {i['id']}  {loc}  {fmt_datetime(i['createdAt'])}  status={i['status']}"
              f"  AI confidence {round((i.get('aiConfidence') or 0) * 100)}%"
              + (f"  tech={tech['name']}" if tech else ""))

    choice = input("\nEnter a number to see detail, or Enter to go back: ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(s["incidents"]):
        i = s["incidents"][int(choice) - 1]
        header(f"Incident detail — {i['id']}")
        print(i["title"])
        print(f"Severity: {i['severity'].upper()}   Status: {i['status']}")
        print(f"Created: {fmt_datetime(i['createdAt'])}")
        related = related_log_entries(i, s)
        print(f"\nRelated audit log entries ({len(related)}):")
        for entry in related[:10]:
            print(f"  [{fmt_time(entry['ts'])}] {entry['actor']:<14} {entry['tool']:<26} {entry['result']}")
        input("\nPress Enter to continue...")


def page_agent(app: CampusOpsApp) -> None:
    header("Agent Console")
    print("Runs so far:")
    for r in app.agent_runs:
        print(f"  [{r['status']:<20}] {r['title']}")
        for st in r["steps"]:
            print(f"      - {st['tool']:<26} [{st['risk']:<8}] {st['status']:<16} {st.get('result', '')}")

    print("\nOptions:")
    print("  1) Run AC failure demo")
    print("  2) Run projector failure demo")
    print("  3) Run network outage demo")
    print("  4) Run building power shutdown demo (CRITICAL)")
    print("  5) Type a free-text command")
    print("  0) Back")
    choice = input("> ").strip()
    demo_map = {"1": "ac", "2": "projector", "3": "network", "4": "shutdown"}
    if choice in demo_map:
        if app.run_lock:
            print("A demo is already running.")
        else:
            run_id = app.start_demo(demo_map[choice])
            _print_run_summary(app, run_id)
    elif choice == "5":
        text = input("Describe the issue: ").strip()
        run_id = app.submit_command(text)
        _print_run_summary(app, run_id)


def _print_run_summary(app: CampusOpsApp, run_id: str | None) -> None:
    if not run_id:
        return
    run = app.find_run(run_id)
    if not run:
        return
    print(f"\n=> Run '{run['title']}' — status: {run['status']}")
    for st in run["steps"]:
        print(f"   - {st['tool']:<26} [{st['risk']:<8}] {st['status']:<16} {st.get('result', '')}")
    if run["status"] == "running":
        pending = [a for a in app.pending_approvals if a.get("runId") == run_id]
        if pending:
            print("   This run is paused, awaiting approval — see the Approvals page.")


def page_campus(app: CampusOpsApp) -> None:
    s = app.store
    header("Campus")
    for b in s["buildings"]:
        print(f"\n{b['name']} ({b['floors']} floors)")
        for r in [r for r in s["rooms"] if r["buildingId"] == b["id"]]:
            flags = []
            if r.get("network") == "down":
                flags.append("network down")
            if r.get("infra"):
                flags.append("infrastructure")
            flag_str = f"  [{', '.join(flags)}]" if flags else ""
            print(f"  Room {r['number']:<22} cap={r['capacity']:<4} AC={'Y' if r['hasAC'] else 'N'} "
                  f"Proj={'Y' if r['hasProjector'] else 'N'}  status={r['status']}{flag_str}")


def page_maintenance(app: CampusOpsApp) -> None:
    s = app.store
    header("Maintenance Tickets")
    for m in s["maintenanceTickets"]:
        room = find(s["rooms"], id=m["roomId"])
        tech = find(s["technicians"], id=m.get("technicianId"))
        print(f"{m['id']:<8} {m['priority']:<9} {m['status']:<10} "
              f"room={room['number'] if room else '?':<6} {m['issue']}"
              + (f"  ({tech['name']})" if tech else ""))


def page_approvals(app: CampusOpsApp) -> None:
    header("Approvals & Guardrails")
    pending = app.pending_approvals
    if not pending:
        print("No pending approvals.")
        input("\nPress Enter to continue...")
        return
    for idx, a in enumerate(pending, 1):
        tag = "PRIVILEGED/CRITICAL" if a["privileged"] else a["risk"]
        print(f"{idx}. [{tag}] {TOOLS[a['tool']]['label']} — {a['reason']}")
        print(f"   affected: {a['affected']}   args: {a['args']}")

    choice = input("\nEnter a number to review, or Enter to go back: ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(pending):
        a = pending[int(choice) - 1]
        decision = input("Approve or deny? [a/d]: ").strip().lower()
        if decision == "a":
            privileged_confirmed = True
            if a["privileged"]:
                confirm = input("This is a CRITICAL privileged action. Type CONFIRM to proceed: ").strip()
                privileged_confirmed = confirm == "CONFIRM"
            ok, msg = app.resolve_approval(a["id"], "approve", privileged_confirmed)
            print(msg)
        elif decision == "d":
            ok, msg = app.resolve_approval(a["id"], "deny")
            print(msg)


def page_analytics(app: CampusOpsApp) -> None:
    s = app.store
    header("Analytics & Learning")
    by_building = incidents_by_building(s)
    print("Incidents by Building:")
    max_b = max((c for _, c in by_building), default=1)
    for name, count in by_building:
        print(f"  {name:<16} {ascii_bar(count, max_b, 16)} {count}")

    by_type = incidents_by_type(s)
    print("\nMaintenance Tickets by Type:")
    max_t = max((c for _, c in by_type), default=1)
    for name, count in by_type:
        print(f"  {name:<12} {ascii_bar(count, max_t, 16)} {count}")

    print("\nInsights — Self-Learning & Adaptation:")
    for r in top_recurring(s):
        print(f"  {r['roomLabel']:<24} {r['type']:<10} {r['count']} incidents/30d  [{r['confidence']} CONFIDENCE]")
        if r["confidence"] == "HIGH":
            print("      AI recommendation: repeated reactive repairs suggest this unit needs "
                  "preventive maintenance rather than continued point fixes.")

    print("\nTool Success Rate:")
    for tool, rate in tool_success_rates(s):
        print(f"  {tool:<28} {ascii_bar(rate, 100, 20)} {rate}%")


def page_audit(app: CampusOpsApp) -> None:
    s = app.store
    header("Audit Log")
    print(f"{'Time':<10} {'Actor':<15} {'Action':<26} {'Risk':<9} {'Approval':<9} {'Dur(ms)':<8} Outcome")
    for l in s["auditLog"]:
        outcome = "OK" if l["success"] is True else "FAIL" if l["success"] is False else "..."
        print(f"{fmt_time(l['ts']):<10} {l['actor']:<15} {l['tool']:<26} {l['risk']:<9} "
              f"{l['approval']:<9} {round(l['durationMs']):<8} {outcome}  {l['result']}")
    if not s["auditLog"]:
        print("No actions logged yet. Run a demo scenario from the Agent page.")


def main() -> None:
    app = CampusOpsApp()
    pages = {
        "1": ("Dashboard", page_dashboard),
        "2": ("Incidents", page_incidents),
        "3": ("Agent", page_agent),
        "4": ("Campus", page_campus),
        "5": ("Maintenance", page_maintenance),
        "6": ("Approvals", page_approvals),
        "7": ("Analytics", page_analytics),
        "8": ("Audit Log", page_audit),
    }
    print("CampusOps — DEMO MODE (live & safe, runs entirely locally)")
    while True:
        pending = len(app.pending_approvals)
        print("\n" + "-" * 72)
        for key, (label, _) in pages.items():
            suffix = f"  ({pending} awaiting approval)" if label == "Approvals" and pending else ""
            print(f"  {key}) {label}{suffix}")
        print("  r) Reset demo")
        print("  q) Quit")
        choice = input("> ").strip().lower()
        if choice == "q":
            break
        if choice == "r":
            app.reset_demo()
            print("Demo reset.")
            continue
        page = pages.get(choice)
        if page:
            try:
                page[1](app)
            except (EOFError, KeyboardInterrupt):
                break
        else:
            print("Unrecognized option.")


if __name__ == "__main__":
    try:
        main()
    except (EOFError, KeyboardInterrupt):
        print("\nGoodbye.")
