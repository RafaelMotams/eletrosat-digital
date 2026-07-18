ALTER TABLE `tenants` MODIFY COLUMN `status` enum('ativo','trial','expirado','suspenso','cancelado') NOT NULL DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE `tenants` ADD `diasTrial` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `trialInicio` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `trialFim` timestamp;