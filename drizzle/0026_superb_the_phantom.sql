ALTER TABLE `atribuicoes_manual` MODIFY COLUMN `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `escolas` MODIFY COLUMN `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `manutencoes` MODIFY COLUMN `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `ordens_servico` MODIFY COLUMN `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `planilhas_importadas` MODIFY COLUMN `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `tecnico_valores_ap` MODIFY COLUMN `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `tecnicos` MODIFY COLUMN `tenantId` int NOT NULL;