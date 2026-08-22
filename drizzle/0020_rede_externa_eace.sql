CREATE TABLE `rede_externa_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`driveFolderId` varchar(255),
	`driveFolderNome` varchar(255),
	`ultimaSincronizacao` timestamp,
	`ultimoResultado` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rede_externa_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `rede_externa_config_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `rede_externa_fotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`escolaId` int,
	`categoria` enum('roteador_modem','fachada','antena','cto_caixa','entrada_cabo','teste_conexao','travessia','outro') NOT NULL DEFAULT 'outro',
	`statusVinculo` enum('vinculada','revisao','ignorada') NOT NULL DEFAULT 'revisao',
	`titulo` varchar(255),
	`originalNome` varchar(500) NOT NULL,
	`originalMimeType` varchar(120),
	`origem` enum('pasta','zip','google_drive','manual') NOT NULL,
	`caminhoOrigem` text,
	`driveFileId` varchar(255),
	`driveModifiedTime` varchar(64),
	`sha256` varchar(64),
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rede_externa_fotos_id` PRIMARY KEY(`id`),
	CONSTRAINT `rede_externa_tenant_drive_file_unique` UNIQUE(`tenantId`,`driveFileId`)
);
--> statement-breakpoint
ALTER TABLE `escolas` ADD `redeExternaStatus` enum('nao_informada','com_rede','sem_rede','em_validacao') DEFAULT 'nao_informada' NOT NULL;--> statement-breakpoint
ALTER TABLE `escolas` ADD `redeExternaTipo` enum('fibra','radio','satelite','movel','outro');--> statement-breakpoint
ALTER TABLE `escolas` ADD `redeExternaObservacao` text;--> statement-breakpoint
CREATE INDEX `rede_externa_tenant_escola_idx` ON `rede_externa_fotos` (`tenantId`,`escolaId`);--> statement-breakpoint
CREATE INDEX `rede_externa_tenant_status_idx` ON `rede_externa_fotos` (`tenantId`,`statusVinculo`);