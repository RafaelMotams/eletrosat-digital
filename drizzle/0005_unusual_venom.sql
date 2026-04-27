CREATE TABLE `tenant_admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`senhaHash` varchar(255) NOT NULL,
	`role` enum('admin','viewer') NOT NULL DEFAULT 'admin',
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimoLogin` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`plano` enum('basico','profissional','enterprise') NOT NULL DEFAULT 'basico',
	`status` enum('ativo','suspenso','cancelado') NOT NULL DEFAULT 'ativo',
	`contato` varchar(255),
	`email` varchar(320),
	`telefone` varchar(30),
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `escolas` DROP INDEX `escolas_inep_unique`;--> statement-breakpoint
ALTER TABLE `tecnicos` DROP INDEX `tecnicos_email_unique`;--> statement-breakpoint
ALTER TABLE `atribuicoes_manual` ADD `tenantId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `escolas` ADD `tenantId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `tenantId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tecnicos` ADD `tenantId` int DEFAULT 1 NOT NULL;