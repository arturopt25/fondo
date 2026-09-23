import { z } from "zod";

export const serviceKeySchema = z.enum([
  "PERSONAL_FINANCE",
  "VEHICLE",
  "HOME",
  "INSURANCE",
  "ENTREPRENEURSHIP",
]);
export type ServiceKey = z.infer<typeof serviceKeySchema>;

export const serviceStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const serviceLedgerModeSchema = z.enum(["SHARED", "SEPARATE"]);
export type ServiceLedgerMode = z.infer<typeof serviceLedgerModeSchema>;

export const serviceDefinitionSchema = z.object({
  key: serviceKeySchema,
  name: z.string(),
  description: z.string(),
});
export type ServiceDefinition = z.infer<typeof serviceDefinitionSchema>;

export const serviceWithStatusSchema = serviceDefinitionSchema.extend({
  status: serviceStatusSchema,
});
export type ServiceWithStatus = z.infer<typeof serviceWithStatusSchema>;

export const serviceCapabilitySchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  required: z.boolean(),
  defaultEnabled: z.boolean(),
  dependsOn: z.array(z.string()),
});
export type ServiceCapability = z.infer<typeof serviceCapabilitySchema>;

export const serviceWithCapabilitiesSchema = serviceWithStatusSchema.extend({
  ledgerMode: serviceLedgerModeSchema,
  capabilities: z.array(serviceCapabilitySchema),
  selectedCapabilities: z.array(z.string()),
});
export type ServiceWithCapabilities = z.infer<
  typeof serviceWithCapabilitiesSchema
>;

export const serviceCatalogResponseSchema = z.object({
  services: z.array(serviceWithStatusSchema),
});
export type ServiceCatalogResponse = z.infer<
  typeof serviceCatalogResponseSchema
>;

export const serviceCatalogWithCapabilitiesResponseSchema = z.object({
  services: z.array(serviceWithCapabilitiesSchema),
});
export type ServiceCatalogWithCapabilitiesResponse = z.infer<
  typeof serviceCatalogWithCapabilitiesResponseSchema
>;

export const updateServiceConfigSchema = z.object({
  capabilities: z.array(z.string()).optional(),
  ledgerMode: serviceLedgerModeSchema.optional(),
});
export type UpdateServiceConfigInput = z.infer<
  typeof updateServiceConfigSchema
>;

export const activeServicesResponseSchema = z.object({
  active: z.array(serviceKeySchema),
});
export type ActiveServicesResponse = z.infer<
  typeof activeServicesResponseSchema
>;
