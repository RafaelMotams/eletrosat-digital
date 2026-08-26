CREATE TABLE `tecnico_sessions` (
	`id` varchar(64) NOT NULL,
	`tecnicoId` int NOT NULL,
	`tenantId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tecnico_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tecnico_sessions_tecnico_active_idx` ON `tecnico_sessions` (`tecnicoId`,`revokedAt`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `tecnico_sessions_tenant_active_idx` ON `tecnico_sessions` (`tenantId`,`revokedAt`,`expiresAt`);