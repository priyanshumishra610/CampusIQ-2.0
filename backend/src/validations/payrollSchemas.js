
**
 * Validation Schemas for Payroll Routes
 * 
 * Defines Zod schemas for request validation on payroll endpoints.
 */

const { z } = require('zod');
const { CommonSchemas } = require('../middleware/validation');

/**
 * Get payroll records query schema
 */
const getPayrollRecordsQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/).optional(),
  year: z.string().regex(/^\d{4}$/).transform(Number).pipe(z.number().int().min(2000).max(2100)).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

/**
 * Payroll record ID param schema
 */
const payrollRecordIdParamSchema = z.object({
  id: z.string().uuid('Invalid payroll record ID format'),
});

/**
 * Generate payroll body schema
 */
const generatePayrollSchema = z.object({
  employeeIds: z.array(z.string().uuid()).optional().nullable(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  payPeriodStart: CommonSchemas.dateString,
  payPeriodEnd: CommonSchemas.dateString,
}).refine(
  (data) => new Date(data.payPeriodStart) <= new Date(data.payPeriodEnd),
  { message: 'Pay period start must be before or equal to end date', path: ['payPeriodEnd'] }
);

/**
 * Update payroll record body schema
 */
const updatePayrollRecordSchema = z.object({
  basicSalary: z.number().nonnegative().optional(),
  allowances: z.record(z.any()).optional(),
  deductions: z.record(z.any()).optional(),
  bonuses: z.number().nonnegative().optional(),
  incentives: z.number().nonnegative().optional(),
  overtimePay: z.number().nonnegative().optional(),
  paymentStatus: z.enum(['DRAFT', 'GENERATED', 'APPROVED', 'PAID', 'CANCELLED']).optional(),
  paymentDate: CommonSchemas.dateString.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Create salary structure body schema
 */
const createSalaryStructureSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  components: z.object({
    basic: z.number().nonnegative('Basic salary must be non-negative'),
    allowances: z.record(z.number().nonnegative()).optional(),
    deductions: z.record(z.number().nonnegative()).optional(),
  }),
});

module.exports = {
  getPayrollRecordsQuerySchema,
  payrollRecordIdParamSchema,
  generatePayrollSchema,
  updatePayrollRecordSchema,
  createSalaryStructureSchema,
};
