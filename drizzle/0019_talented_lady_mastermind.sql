CREATE TABLE `registration_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`empresaNome` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`senhaHash` varchar(255) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pendente','confirmado','expirado') NOT NULL DEFAULT 'pendente',
	`expiresAt` timestamp NOT NULL,
	`confirmedAt` timestamp,
	`tenantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registration_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `registration_requests_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `registration_requests_email_unique` UNIQUE(`email`),
	CONSTRAINT `registration_requests_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `manutencoes` MODIFY COLUMN `quilometragem` decimal(8,2) DEFAULT '0';