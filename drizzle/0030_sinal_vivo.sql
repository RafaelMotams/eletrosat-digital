CREATE TABLE `sinal_vivo_pulsos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`escolaId` int NOT NULL,
	`status` enum('ok','lento','offline') NOT NULL,
	`temEnergia` boolean,
	`ledsModemOk` boolean,
	`vizinhosTambem` boolean,
	`classificacao` varchar(40) NOT NULL,
	`relato` text,
	`origem` enum('publico','admin','tecnico') NOT NULL DEFAULT 'publico',
	`contatoNome` varchar(255),
	`contatoTelefone` varchar(30),
	`incidenteId` int,
	`manutencaoId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sinal_vivo_pulsos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sinal_vivo_incidentes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`municipio` varchar(255) NOT NULL,
	`status` enum('aberto','monitorando','resolvido') NOT NULL DEFAULT 'aberto',
	`escolasAfetadas` int NOT NULL DEFAULT 0,
	`resumo` text,
	`resolvidoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sinal_vivo_incidentes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sinal_vivo_pulsos_tenant_escola_created_idx` ON `sinal_vivo_pulsos` (`tenantId`,`escolaId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `sinal_vivo_pulsos_tenant_created_idx` ON `sinal_vivo_pulsos` (`tenantId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `sinal_vivo_pulsos_tenant_status_created_idx` ON `sinal_vivo_pulsos` (`tenantId`,`status`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `sinal_vivo_incidentes_tenant_status_idx` ON `sinal_vivo_incidentes` (`tenantId`,`status`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `sinal_vivo_incidentes_tenant_municipio_idx` ON `sinal_vivo_incidentes` (`tenantId`,`municipio`,`status`);
