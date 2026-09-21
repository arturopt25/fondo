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

export const serviceCatalogResponseSchema = z.object({
  services: z.array(serviceWithStatusSchema),
});
export type ServiceCatalogResponse = z.infer<typeof serviceCatalogResponseSchema>;

export const activeServicesResponseSchema = z.object({
  active: z.array(serviceKeySchema),
});
export type ActiveServicesResponse = z.infer<typeof activeServicesResponseSchema>;