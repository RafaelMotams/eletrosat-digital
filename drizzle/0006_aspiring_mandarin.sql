CREATE TABLE `os_fotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`osId` int NOT NULL,
	`escolaId` int NOT NULL,
	`tecnicoId` int NOT NULL,
	`categoria` enum('mapa_calor','fotos_ap','etiqueta_serial_ap','etiqueta_controladora','etiqueta_nobreak') NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `os_fotos_id` PRIMARY KEY(`id`)
);
