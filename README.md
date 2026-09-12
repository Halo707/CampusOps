# CampusOps
HackBattle Problem Statement track 1, "AI and Automation"
CampusOps — Autonomous AI for Real-World Campus Operations

What it demonstrates
Agentic workflows — The agent chains 6–9 real tool calls per incident (`get_room_status → get_room_schedule → get_maintenance_history → create_maintenance_ticket → assign_technician → find_available_room → move_booking → send_notification → detect_recurring_issue`), visibly, in the Agent console's execution timeline.
Guardrails & trust — A policy engine (`decidePolicy`) assigns every tool a risk tier (LOW/MEDIUM/HIGH/CRITICAL). LOW auto-executes. MEDIUM auto-executes unless it displaces an already-in-progress booking, in which case it pauses for human approval. HIGH always pauses for approval. CRITICAL (e.g. `shutdown_building_power`) is never auto-executed — it can only proceed through an explicit two-step "privileged override" confirmation, and the UI makes that friction visible on purpose.
Self-learning / adaptation — `detect_recurring_issue` and the Analytics page compute real recurrence stats off the seeded maintenance history (Room SJT-304 has 6 HVAC tickets in 30 days seeded on purpose, so the agent correctly flags it as a HIGH-confidence recurring issue and recommends preventive maintenance instead of another point fix).
Pages
Dashboard · Incidents · Agent (hero page — chat input, live execution timeline, inline approvals) · Campus (building → room drill-down with live status) · Maintenance · Approvals · Analytics · Audit Log — all eight from the spec, all wired to the same shared state.
How to run it
This ships as a single React component artifact (`CampusOps.jsx`). Open it in the Claude artifact viewer / any React sandbox that provides `react`, `lucide-react`, and `recharts` (all standard artifact-runtime libraries) — it renders and runs immediately, no build step, no `npm install`, no environment variables.
If you want to lift this into a real Next.js + Prisma + Postgres + OpenAI deployment later, the natural seams are:
Replace `makeSeed()`/`useState(store)` with Prisma models matching the same shape.
Replace `execTool`'s switch statement with real API route handlers (`/api/agent/run`, `/api/agent/approve`, etc.) — the risk/approval logic in `decidePolicy` ports over unchanged.
Replace `submitCommand`'s keyword router with a real OpenAI tool-calling loop, using the exact `TOOLS` registry as your function-calling schema — the shapes already match.
Demo instructions (2-minute run)
Land on Dashboard. Point out the live stat bar and empty activity feed.
Go to Agent, click AC Failure — Room 304.
Narrate the timeline as it plays: status check → schedule check → maintenance history → ticket created → technician assigned → alternate room found → approval card appears (moving an active booking always requires a human) → click Approve → booking moves → notification fires → recurring-issue detection flags Room 304 as a HIGH-confidence repeat failure.
Jump to Approvals or Audit Log to show the full paper trail.
Click Shut Down Building Power to show the guardrail that matters most: a CRITICAL action refuses to auto-execute and demands an explicit privileged override — this is the "it says no" moment that proves the guardrails are real, not decorative.
Hit Reset demo in the top bar to return to a clean seeded state before the next run-through.
Example prompts (Agent console free-text input)
"Room 304 AC failed. Physics lab starts in 12 minutes. Handle it."
"Projector in AB2-203 stopped working 15 minutes before class."
"Network is down in Tech Tower and 3 classes are affected."
"Shut down the building's main power system."
Why this is agentic, not a chatbot
The agent doesn't just answer — it inspects live state, decides a multi-step plan, calls real tools that mutate the shared database, and adapts that plan based on what it finds (e.g. it only searches for an alternate room because the schedule check found a class starting imminently). A chatbot describes what to do; this agent does it.
Why this is safe
No tool call reaches the database directly from the model layer. Every single action — including the ones a human clicks through the UI — passes through one policy engine, is risk-classified, and is logged with a full timestamped record. Nothing above MEDIUM risk executes without a human in the loop, and CRITICAL actions have no automatic path at all.
Limitations
Runs as client-side state, not a persisted database — a page refresh resets it (use "Reset demo" intentionally instead).
The "AI" is a deterministic policy-aware planner tuned to the four demo scenarios and simple keyword routing, not a live LLM — by design, per `DEMO_MODE`, but it means novel free-text incidents outside the four scripted patterns fall back to the closest matching scenario rather than genuinely improvising.
No multi-user auth/session model — approvals are global, not scoped to a signed-in reviewer.
