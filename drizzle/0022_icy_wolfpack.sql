CREATE TABLE `estoque_movimentacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`materialId` int NOT NULL,
	`tipo` enum('entrada','transferencia','consumo','devolucao','ajuste') NOT NULL,
	`origemType` enum('almoxarifado','tecnico','externo') NOT NULL,
	`origemId` int NOT NULL DEFAULT 0,
	`destinoType` enum('almoxarifado','tecnico','consumo') NOT NULL,
	`destinoId` int NOT NULL DEFAULT 0,
	`quantidade` decimal(12,3) NOT NULL,
	`ordemServicoId` int,
	`manutencaoId` int,
	`observacao` text,
	`clientId` varchar(100),
	`actorType` enum('admin','tecnico','sistema') NOT NULL,
	`actorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `estoque_movimentacoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `estoque_mov_client_id_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `estoque_saldos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`materialId` int NOT NULL,
	`holderType` enum('almoxarifado','tecnico') NOT NULL,
	`holderId` int NOT NULL DEFAULT 0,
	`quantidade` decimal(12,3) NOT NULL DEFAULT '0.000',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estoque_saldos_id` PRIMARY KEY(`id`),
	CONSTRAINT `estoque_saldo_holder_unique` UNIQUE(`tenantId`,`materialId`,`holderType`,`holderId`)
);
--> statement-breakpoint
CREATE TABLE `materiais_estoque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`codigo` varchar(80) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`categoria` varchar(100),
	`unidade` varchar(20) NOT NULL DEFAULT 'un',
	`estoqueMinimo` decimal(12,3) NOT NULL DEFAULT '0.000',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materiais_estoque_id` PRIMARY KEY(`id`),
	CONSTRAINT `materiais_tenant_codigo_unique` UNIQUE(`tenantId`,`codigo`)
);
--> statement-breakpoint
CREATE INDEX `estoque_mov_tenant_created_idx` ON `estoque_movimentacoes` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `estoque_mov_material_created_idx` ON `estoque_movimentacoes` (`tenantId`,`materialId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `estoque_saldo_tenant_holder_idx` ON `estoque_saldos` (`tenantId`,`holderType`,`holderId`);--> statement-breakpoint
CREATE INDEX `materiais_tenant_nome_idx` ON `materiais_estoque` (`tenantId`,`nome`);