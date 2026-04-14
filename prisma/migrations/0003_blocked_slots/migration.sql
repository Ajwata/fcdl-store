CREATE TABLE `BlockedSlot` (
    `id` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL,

    INDEX `BlockedSlot_date_sector_idx`(`date`, `sector`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
