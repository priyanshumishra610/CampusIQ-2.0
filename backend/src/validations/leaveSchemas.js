/**
 * Validation Schemas for Leave Routes
 * 
 * Defines Zod schemas for request validation on leave management endpoints.
 */

const { z } = require('zod');
const { CommonSchemas } = require('../middleware/validation');

/**
 * Get leave requests query schema
 */
const getLeaveRequestsQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  leaveType: z.string().optional(),
  startDate: CommonSchemas.dateString.optional(),
  endDate: CommonSchemas.dateString.optional(),
  department: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

/**
 * Create leave request body schema
 */
const createLeaveRequestSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  leaveType: z.enum(['SICK', 'VACATION', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID'], {
    errorMap: () => ({ message: 'Invalid leave type' }),
  }),
  startDate: CommonSchemas.dateString,
  endDate: CommonSchemas.dateString,
  reason: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date', path: ['endDate'] }
).refine(
  (data) => new Date(data.startDate) >= new Date().toISOString().split('T')[0],
  { message: 'Start date cannot be in the past', path: ['startDate'] }
);

/**
 * Approve/Reject leave request body schema
 */
const approveLeaveRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], {
    errorMap: () => ({ message: 'Action must be APPROVE or REJECT' }),
  }),
  rejectionReason: z.string().max(500).optional().nullable(),
  approvalLevel: z.enum(['MANAGER', 'HR'], {
    errorMap: () => ({ message: 'Approval level must be MANAGER or HR' }),
  }),
}).refine(
  (data) => data.action !== 'REJECT' || data.rejectionReason,
  { message: 'Rejection reason is required when rejecting', path: ['rejectionReason'] }
);

/**
 * Leave request ID param schema
 */
const leaveRequestIdParamSchema = z.object({
  id: z.string().uuid('Invalid leave request ID format'),
});

/**
 * Get leave balance query schema
 */
const getLeaveBalanceQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/).transform(Number).pipe(z.number().int().min(2000).max(2100)).optional(),
});

/**
 * Employee ID param schema
 */
const employeeIdParamSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
});

/**
 * Update leave balance body schema
 */
const updateLeaveBalanceSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  leaveType: z.enum(['SICK', 'VACATION', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID']),
  totalAllocated: z.number().nonnegative('Total allocated must be non-negative'),
  year: z.number().int().min(2000).max(2100).optional(),
});

/**
 * Get leave statistics query schema
 */
const getLeaveStatisticsQuerySchema = z.object({
  department: z.string().optional(),
  year: z.string().regex(/^\d{4}$/).transform(Number).pipe(z.number().int().min(2000).max(2100)).optional(),
});

module.exports = {
  getLeaveRequestsQuerySchema,
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  leaveRequestIdParamSchema,
  getLeaveBalanceQuerySchema,
  employeeIdParamSchema,
  updateLeaveBalanceSchema,
  getLeaveStatisticsQuerySchema,
};
