CREATE TABLE `tecnico_valores_ap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tecnicoId` int NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`qtdAp` int NOT NULL,
	`valor` decimal(10,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tecnico_valores_ap_id` PRIMARY KEY(`id`)
);
