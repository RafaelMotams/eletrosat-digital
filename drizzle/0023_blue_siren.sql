CREATE TABLE `admin_sessions` (
	`id` varchar(64) NOT NULL,
	`adminId` int NOT NULL,
	`tenantId` int NOT NULL,
	`role` varchar(24) NOT NULL,
	`isSuperAdmin` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_sessions_admin_active_idx` ON `admin_sessions` (`adminId`,`revokedAt`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `admin_sessions_tenant_active_idx` ON `admin_sessions` (`tenantId`,`revokedAt`,`expiresAt`);