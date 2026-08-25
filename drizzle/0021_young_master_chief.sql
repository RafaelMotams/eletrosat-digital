CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`actorType` enum('superadmin','admin','viewer','tecnico','sistema') NOT NULL,
	`actorId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` varchar(100),
	`success` boolean NOT NULL DEFAULT true,
	`metadata` text,
	`ip` varchar(64),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_tenant_created_idx` ON `audit_events` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_actor_created_idx` ON `audit_events` (`actorType`,`actorId`,`createdAt`);