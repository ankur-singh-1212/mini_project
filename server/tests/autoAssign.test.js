import test from "node:test";
import assert from "node:assert/strict";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import {
  CATEGORY_DEPARTMENT,
  DEFAULT_DEPARTMENT_NAME,
  departmentNameForCategory,
} from "../src/config/categoryDepartment.js";
import { needsReview, MIN_AUTO_ASSIGN_CONFIDENCE } from "../src/config/autoClassify.js";
import { predictCategory } from "../src/services/predictionService.js";
import { resolveDepartment, pickLeastLoadedAgent } from "../src/services/autoAssignService.js";
import Department from "../src/models/Department.js";
import User from "../src/models/User.js";
import Complaint from "../src/models/Complaint.js";

test.before(async () => {
  process.env.NODE_ENV = "test";
  await connectDatabase();
});

test.after(async () => {
  await disconnectDatabase();
});

test("category -> department mapping is complete and editable", () => {
  assert.equal(departmentNameForCategory("Network and Internet"), "IT Support");
  assert.equal(departmentNameForCategory("Electricity and Safety"), "Electrical");
  assert.equal(departmentNameForCategory("Water and Sanitation"), "Facilities");
  assert.equal(departmentNameForCategory("Other"), DEFAULT_DEPARTMENT_NAME);
  // Unknown values fall back instead of crashing.
  assert.equal(departmentNameForCategory("Made up category"), DEFAULT_DEPARTMENT_NAME);
  assert.equal(departmentNameForCategory(undefined), DEFAULT_DEPARTMENT_NAME);
  assert.equal(Object.keys(CATEGORY_DEPARTMENT).length > 0, true);
});

test("confidence threshold flags low-confidence predictions for review", () => {
  assert.equal(needsReview(0.1), true);
  assert.equal(needsReview(MIN_AUTO_ASSIGN_CONFIDENCE - 0.01), true);
  assert.equal(needsReview(MIN_AUTO_ASSIGN_CONFIDENCE), false);
  assert.equal(needsReview(0.9), false);
  assert.equal(needsReview(undefined), true);
});

test("category prediction falls back to rules when ML service is down", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("ML service unavailable");
  };
  try {
    const result = await predictCategory("Wi-Fi and internet connection not working");
    assert.equal(result.source, "rule-based-fallback");
    assert.equal(result.category, "Network and Internet");
    assert.ok(result.confidence > 0 && result.confidence <= 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("department resolution returns null when the mapped department is missing", async () => {
  const result = await resolveDepartment("Electricity and Safety");
  // No departments seeded in this isolated test database.
  assert.equal(result, null);
});

test("least-loaded active agent in the department is selected", async () => {
  const stamp = Date.now();
  const dept = await Department.create({ name: `AutoDept-${stamp}` });
  const reporter = await User.create({
    name: "Reporter",
    email: `reporter-${stamp}@example.com`,
    password: "Password123!",
    role: "user",
  });
  const busy = await User.create({
    name: "Busy Agent",
    email: `busy-${stamp}@example.com`,
    password: "Password123!",
    role: "agent",
    department: dept._id,
  });
  const free = await User.create({
    name: "Free Agent",
    email: `free-${stamp}@example.com`,
    password: "Password123!",
    role: "agent",
    department: dept._id,
  });
  await User.create({
    name: "Inactive Agent",
    email: `inactive-${stamp}@example.com`,
    password: "Password123!",
    role: "agent",
    department: dept._id,
    isActive: false,
  });

  for (let i = 0; i < 3; i += 1) {
    await Complaint.create({
      complaintId: `AUTO-${stamp}-${i}`,
      title: "Busy complaint",
      description: "Busy complaint description",
      reporter: reporter._id,
      assignedAgent: busy._id,
      department: dept._id,
      status: "In Progress",
    });
  }
  await Complaint.create({
    complaintId: `AUTO-${stamp}-free`,
    title: "Free complaint",
    description: "Free complaint description",
    reporter: reporter._id,
    assignedAgent: free._id,
    department: dept._id,
    status: "Assigned",
  });

  const picked = await pickLeastLoadedAgent(dept._id);
  assert.ok(picked);
  assert.equal(picked._id.toString(), free._id.toString());
  assert.equal(picked.openCount, 1);

  // Closed complaints must not count towards the open load.
  await Complaint.create({
    complaintId: `AUTO-${stamp}-closed`,
    title: "Closed complaint",
    description: "Closed complaint description",
    reporter: reporter._id,
    assignedAgent: free._id,
    department: dept._id,
    status: "Closed",
  });
  const stillFree = await pickLeastLoadedAgent(dept._id);
  assert.equal(stillFree._id.toString(), free._id.toString());

  // Once free becomes the busier agent, the other one is selected.
  for (let i = 0; i < 3; i += 1) {
    await Complaint.create({
      complaintId: `AUTO-${stamp}-more-${i}`,
      title: "More work",
      description: "More work description",
      reporter: reporter._id,
      assignedAgent: free._id,
      department: dept._id,
      status: "In Progress",
    });
  }
  const switched = await pickLeastLoadedAgent(dept._id);
  assert.equal(switched._id.toString(), busy._id.toString());

  // No agents in a department -> null (goes to the unassigned queue).
  const emptyDept = await Department.create({ name: `EmptyDept-${stamp}` });
  assert.equal(await pickLeastLoadedAgent(emptyDept._id), null);
});
