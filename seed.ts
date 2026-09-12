// npx prisma db seed  (after adding the "prisma.seed" entry in package.json — see PRISMA_SETUP.md)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.approvalRequest.deleteMany();
  await prisma.agentAction.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.systemPolicy.deleteMany();
  await prisma.user.deleteMany();

  const buildings = await Promise.all(
    [
      { name: "Tech Tower", floors: 6 },
      { name: "SJT", floors: 5 },
      { name: "AB1", floors: 4 },
      { name: "AB2", floors: 4 },
      { name: "Library", floors: 3 },
      { name: "Main Block", floors: 4 },
    ].map((b) => prisma.building.create({ data: b }))
  );
  const [bt, sjt, ab1, ab2, lib, mb] = buildings;

  const rooms = await Promise.all(
    [
      { number: "304", buildingId: sjt.id, capacity: 60, hasAC: true, hasProjector: true, status: "OCCUPIED" as const },
      { number: "401", buildingId: sjt.id, capacity: 55, hasAC: true, hasProjector: true, status: "AVAILABLE" as const },
      { number: "101", buildingId: sjt.id, capacity: 90, hasAC: true, hasProjector: true, status: "AVAILABLE" as const },
      { number: "203", buildingId: sjt.id, capacity: 40, hasAC: false, hasProjector: true, status: "AVAILABLE" as const },
      { number: "203", buildingId: ab2.id, capacity: 45, hasAC: true, hasProjector: true, status: "OCCUPIED" as const },
      { number: "210", buildingId: ab2.id, capacity: 45, hasAC: true, hasProjector: true, status: "AVAILABLE" as const },
      { number: "105", buildingId: ab2.id, capacity: 70, hasAC: true, hasProjector: false, status: "AVAILABLE" as const },
      { number: "102", buildingId: ab1.id, capacity: 50, hasAC: true, hasProjector: true, status: "AVAILABLE" as const },
      { number: "201", buildingId: ab1.id, capacity: 50, hasAC: true, hasProjector: true, status: "RESERVED" as const },
      { number: "501", buildingId: bt.id, capacity: 30, hasAC: true, hasProjector: true, status: "OCCUPIED" as const },
      { number: "502", buildingId: bt.id, capacity: 30, hasAC: true, hasProjector: true, status: "OCCUPIED" as const },
      { number: "503", buildingId: bt.id, capacity: 30, hasAC: true, hasProjector: true, status: "OCCUPIED" as const },
      { number: "Main Power Room", buildingId: bt.id, capacity: 0, hasAC: false, hasProjector: false, status: "CRITICAL" as const, isInfra: true },
      { number: "Basement Study Hall", buildingId: lib.id, capacity: 120, hasAC: true, hasProjector: false, status: "AVAILABLE" as const },
      { number: "110", buildingId: mb.id, capacity: 65, hasAC: true, hasProjector: true, status: "AVAILABLE" as const },
    ].map((r) => prisma.room.create({ data: r }))
  );
  const room304 = rooms[0];
  const roomAB2_203 = rooms[4];
  const roomBT501 = rooms[9];

  const technicians = await Promise.all(
    [
      { name: "R. Muthukumar", specialty: "HVAC" },
      { name: "S. Priyanka", specialty: "Electrical" },
      { name: "A. Fernandes", specialty: "Network/IT" },
      { name: "K. Bala", specialty: "AV/Projector", available: false },
    ].map((t) => prisma.technician.create({ data: t }))
  );
  const hvacTech = technicians[0];
  const avTech = technicians[3];
  const netTech = technicians[2];
  const elecTech = technicians[1];

  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400000);

  // Seeded so Room 304 shows a real recurring HVAC pattern for the
  // self-learning / detect_recurring_issue tool to pick up on.
  await Promise.all(
    [
      { roomId: room304.id, issue: "HVAC compressor fault", priority: "HIGH" as const, technicianId: hvacTech.id, createdAt: daysAgo(28) },
      { roomId: room304.id, issue: "AC unit not cooling", priority: "MEDIUM" as const, technicianId: hvacTech.id, createdAt: daysAgo(23) },
      { roomId: room304.id, issue: "HVAC thermostat unresponsive", priority: "MEDIUM" as const, technicianId: hvacTech.id, createdAt: daysAgo(19) },
      { roomId: room304.id, issue: "AC unit not cooling", priority: "HIGH" as const, technicianId: hvacTech.id, createdAt: daysAgo(14) },
      { roomId: room304.id, issue: "HVAC compressor fault", priority: "HIGH" as const, technicianId: hvacTech.id, createdAt: daysAgo(9) },
      { roomId: room304.id, issue: "AC unit not cooling", priority: "MEDIUM" as const, technicianId: hvacTech.id, createdAt: daysAgo(4) },
      { roomId: roomAB2_203.id, issue: "Projector lamp failure", priority: "MEDIUM" as const, technicianId: avTech.id, createdAt: daysAgo(31) },
      { roomId: roomAB2_203.id, issue: "Projector no signal", priority: "MEDIUM" as const, technicianId: avTech.id, createdAt: daysAgo(6) },
      { roomId: roomBT501.id, issue: "Network switch failure", priority: "HIGH" as const, technicianId: netTech.id, createdAt: daysAgo(17) },
      { roomId: rooms[7].id, issue: "Flickering lights", priority: "LOW" as const, technicianId: elecTech.id, createdAt: daysAgo(40) },
    ].map((t) => prisma.maintenanceTicket.create({ data: { ...t, status: "RESOLVED" } }))
  );

  await prisma.booking.create({
    data: { roomId: room304.id, course: "PHY201 — Physics Lab", students: 42, startTime: new Date(now + 12 * 60000), endTime: new Date(now + 132 * 60000) },
  });
  await prisma.booking.create({
    data: { roomId: roomAB2_203.id, course: "CSE310 — Systems Design", students: 38, startTime: new Date(now + 15 * 60000), endTime: new Date(now + 105 * 60000) },
  });

  await prisma.systemPolicy.createMany({
    data: [
      { name: "Room-status & schedule reads", risk: "LOW", rule: "Auto-execute. No approval needed." },
      { name: "Create maintenance ticket", risk: "LOW", rule: "Auto-execute. Logged to audit trail." },
      { name: "Notify affected students/faculty (<100 recipients)", risk: "LOW", rule: "Auto-execute." },
      { name: "Assign technician", risk: "MEDIUM", rule: "Auto-execute if available and matching specialty; else escalate." },
      { name: "Move an active booking to another room", risk: "MEDIUM", rule: "Always requires human approval." },
      { name: "Cancel a booking outright", risk: "HIGH", rule: "Requires human approval. Never automatic." },
      { name: "Spend budget / order replacement equipment", risk: "HIGH", rule: "Requires human approval with named approver." },
      { name: "Shut down building infrastructure", risk: "CRITICAL", rule: "Never auto-executed. Requires privileged, explicit dual confirmation." },
      { name: "Delete records / irreversible data changes", risk: "CRITICAL", rule: "Denied by default." },
    ],
  });

  console.log("Seeded CampusOps database.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
