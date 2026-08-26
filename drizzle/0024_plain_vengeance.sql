ALTER TABLE `manutencao_fotos` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `os_fotos` ADD `tenantId` int;--> statement-breakpoint
CREATE INDEX `manutencao_fotos_tenant_manutencao_idx` ON `manutencao_fotos` (`tenantId`,`manutencaoId`);--> statement-breakpoint
CREATE INDEX `os_fotos_tenant_os_idx` ON `os_fotos` (`tenantId`,`osId`);