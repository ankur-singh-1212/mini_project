import { z } from "zod";
const categories = ["Technical Issue","Infrastructure and Maintenance","Electricity and Safety","Water and Sanitation","Academic or Administrative","Network and Internet","Hostel or Accommodation","Other"];
const priorities = ["Low","Medium","High","Critical"];
const statuses = ["Submitted","Under Review","Assigned","In Progress","Awaiting User","Resolved","Closed","Reopened"];
// Only reporter-supplied content is accepted. Classification and assignment
// fields are stripped even if a client sends them.
export const createComplaintSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(10).max(5000),
});
export const predictSchema = z.object({
  title: z.string().max(150).optional(),
  description: z.string().max(5000).optional(),
});
export const updateComplaintSchema = z.object({
  title: z.string().min(5).max(150).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.enum(categories).optional(),
  subcategory: z.string().max(80).optional(),
  location: z.string().max(200).optional(),
  priority: z.enum(priorities).optional(),
  department: z.string().optional(),
  assignedAgent: z.string().optional().nullable(),
});
export const statusSchema = z.object({
  status: z.enum(statuses),
  note: z.string().max(1000).optional(),
});
export const commentSchema = z.object({
  body: z.string().min(1).max(2000),
  isInternal: z.boolean().optional(),
});
export const assignSchema = z.object({
  agentId: z.string(),
  departmentId: z.string().optional(),
  priority: z.enum(priorities).optional(),
});
