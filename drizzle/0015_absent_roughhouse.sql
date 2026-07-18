CREATE TABLE `tenant_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`segmento` varchar(100) DEFAULT 'geral',
	`descricaoNegocio` text,
	`terminologia` text,
	`camposExtras` text,
	`corPrimaria` varchar(20) DEFAULT '#00f5a0',
	`logoUrl` text,
	`configFluxo` text,
	`configurado` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_config_tenantId_unique` UNIQUE(`tenantId`)
);
