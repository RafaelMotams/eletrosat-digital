CREATE TABLE `planilhas_importadas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`nome` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`totalEscolas` int DEFAULT 0,
	`ativa` boolean NOT NULL DEFAULT true,
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planilhas_importadas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `escolas` ADD `ativo` boolean DEFAULT true NOT NULL;