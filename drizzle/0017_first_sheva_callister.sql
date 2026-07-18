CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`ip` varchar(64),
	`tentativas` int NOT NULL DEFAULT 0,
	`bloqueadoAte` timestamp,
	`ultimaTentativa` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`email` varchar(255) NOT NULL,
	`tipo` enum('admin','superadmin','tecnico') NOT NULL,
	`sucesso` boolean NOT NULL,
	`ip` varchar(64),
	`userAgent` varchar(512),
	`motivoFalha` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_logs_id` PRIMARY KEY(`id`)
);
