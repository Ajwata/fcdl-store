-- CreateTable
CREATE TABLE `PaymentWindowRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settingsId` VARCHAR(191) NOT NULL,
    `minDaysBeforeStart` INTEGER NOT NULL,
    `maxDaysBeforeStart` INTEGER NULL,
    `paymentHours` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL,

    INDEX `PaymentWindowRule_settingsId_sortOrder_idx`(`settingsId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingSettings` (
    `id` VARCHAR(191) NOT NULL,
    `eveningStartHour` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingSector` (
    `settingsId` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NOT NULL,
    `dayPrice` INTEGER NOT NULL,
    `eveningPrice` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingSector_sector_idx`(`sector`),
    PRIMARY KEY (`settingsId`, `sector`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingDurationRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settingsId` VARCHAR(191) NOT NULL,
    `minHours` INTEGER NOT NULL,
    `maxHours` INTEGER NULL,
    `discountPercent` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL,

    INDEX `PricingDurationRule_settingsId_sortOrder_idx`(`settingsId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CmsConfig` (
    `id` VARCHAR(191) NOT NULL,
    `content` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingCounter` (
    `key` VARCHAR(191) NOT NULL,
    `nextNumber` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimitEntry` (
    `key` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL,
    `windowStart` BIGINT NOT NULL,
    `blockedUntil` BIGINT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientAccessControl` (
    `clientPhoneKey` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NOT NULL,
    `isBlocked` BOOLEAN NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    PRIMARY KEY (`clientPhoneKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManagerAccessControl` (
    `managerId` VARCHAR(191) NOT NULL,
    `isBlocked` BOOLEAN NOT NULL,
    `bonusPercent` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    PRIMARY KEY (`managerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate PaymentSettings.paymentWindowRules JSON -> PaymentWindowRule rows
INSERT INTO `PaymentWindowRule` (`settingsId`, `minDaysBeforeStart`, `maxDaysBeforeStart`, `paymentHours`, `sortOrder`)
SELECT
    ps.`id` AS `settingsId`,
    jt.`minDaysBeforeStart`,
    jt.`maxDaysBeforeStart`,
    jt.`paymentHours`,
    jt.`ord` - 1 AS `sortOrder`
FROM `PaymentSettings` ps
JOIN JSON_TABLE(
    ps.`paymentWindowRules`,
    '$[*]' COLUMNS (
        `ord` FOR ORDINALITY,
        `minDaysBeforeStart` INT PATH '$.minDaysBeforeStart',
        `maxDaysBeforeStart` INT PATH '$.maxDaysBeforeStart' DEFAULT NULL ON EMPTY,
        `paymentHours` INT PATH '$.paymentHours'
    )
) jt;

-- Migrate pricing from AppConfig key 'pricing'
INSERT INTO `PricingSettings` (`id`, `eveningStartHour`, `updatedAt`)
SELECT
    'default',
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.eveningStartHour')) AS UNSIGNED), 18),
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` = 'pricing'
LIMIT 1;

INSERT INTO `PricingSector` (`settingsId`, `sector`, `dayPrice`, `eveningPrice`, `updatedAt`)
SELECT
    'default',
    '№1',
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№1".dayPrice')) AS UNSIGNED), 900),
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№1".eveningPrice')) AS UNSIGNED), 1100),
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` = 'pricing'
LIMIT 1;

INSERT INTO `PricingSector` (`settingsId`, `sector`, `dayPrice`, `eveningPrice`, `updatedAt`)
SELECT
    'default',
    '№2',
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№2".dayPrice')) AS UNSIGNED), 800),
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№2".eveningPrice')) AS UNSIGNED), 1000),
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` = 'pricing'
LIMIT 1;

INSERT INTO `PricingSector` (`settingsId`, `sector`, `dayPrice`, `eveningPrice`, `updatedAt`)
SELECT
    'default',
    '№3',
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№3".dayPrice')) AS UNSIGNED), 900),
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№3".eveningPrice')) AS UNSIGNED), 1100),
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` = 'pricing'
LIMIT 1;

INSERT INTO `PricingSector` (`settingsId`, `sector`, `dayPrice`, `eveningPrice`, `updatedAt`)
SELECT
    'default',
    '№4',
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№4".dayPrice')) AS UNSIGNED), 2500),
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.sectors."№4".eveningPrice')) AS UNSIGNED), 3000),
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` = 'pricing'
LIMIT 1;

INSERT INTO `PricingDurationRule` (`settingsId`, `minHours`, `maxHours`, `discountPercent`, `sortOrder`)
SELECT
    'default',
    jt.`minHours`,
    jt.`maxHours`,
    jt.`discountPercent`,
    jt.`ord` - 1 AS `sortOrder`
FROM `AppConfig` ac
JOIN JSON_TABLE(
    ac.`value`,
    '$.durationDiscountRules[*]' COLUMNS (
        `ord` FOR ORDINALITY,
        `minHours` INT PATH '$.minHours',
        `maxHours` INT PATH '$.maxHours' DEFAULT NULL ON EMPTY,
        `discountPercent` INT PATH '$.discountPercent'
    )
) jt
WHERE ac.`key` = 'pricing';

-- Migrate cms content from AppConfig key 'cms-content'
INSERT INTO `CmsConfig` (`id`, `content`, `updatedAt`)
SELECT
    'default',
    ac.`value`,
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` = 'cms-content'
LIMIT 1;

-- Migrate booking counter from AppConfig key 'booking_counter'
INSERT INTO `BookingCounter` (`key`, `nextNumber`, `updatedAt`)
SELECT
    'booking_counter',
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.next')) AS UNSIGNED), 1),
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` = 'booking_counter'
LIMIT 1;

-- Migrate rate limit entries from AppConfig keys 'ratelimit:*'
INSERT INTO `RateLimitEntry` (`key`, `count`, `windowStart`, `blockedUntil`, `updatedAt`)
SELECT
    ac.`key`,
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.count')) AS UNSIGNED), 0),
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.windowStart')) AS SIGNED), 0),
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(ac.`value`, '$.blockedUntil')) AS SIGNED), 0),
    ac.`updatedAt`
FROM `AppConfig` ac
WHERE ac.`key` LIKE 'ratelimit:%';

-- Migrate client access control records from AppConfig key 'client-access-control'
INSERT INTO `ClientAccessControl` (`clientPhoneKey`, `clientPhone`, `isBlocked`, `updatedAt`, `updatedById`)
SELECT
    COALESCE(jt.`clientPhoneKey`, REGEXP_REPLACE(COALESCE(jt.`clientPhone`, ''), '[^0-9]', '')),
    COALESCE(jt.`clientPhone`, ''),
    COALESCE(jt.`isBlocked`, TRUE),
    COALESCE(jt.`updatedAt`, ac.`updatedAt`),
    jt.`updatedById`
FROM `AppConfig` ac
JOIN JSON_TABLE(
    ac.`value`,
    '$.clients[*]' COLUMNS (
        `clientPhone` VARCHAR(191) PATH '$.clientPhone',
        `clientPhoneKey` VARCHAR(191) PATH '$.clientPhoneKey' DEFAULT NULL ON EMPTY,
        `isBlocked` BOOLEAN PATH '$.isBlocked' DEFAULT TRUE ON EMPTY,
        `updatedAt` DATETIME(3) PATH '$.updatedAt' DEFAULT NULL ON EMPTY,
        `updatedById` VARCHAR(191) PATH '$.updatedById' DEFAULT NULL ON EMPTY
    )
) jt
WHERE ac.`key` = 'client-access-control'
  AND COALESCE(jt.`clientPhoneKey`, REGEXP_REPLACE(COALESCE(jt.`clientPhone`, ''), '[^0-9]', '')) <> '';

-- Migrate manager access control records from AppConfig key 'manager-access-control'
INSERT INTO `ManagerAccessControl` (`managerId`, `isBlocked`, `bonusPercent`, `updatedAt`, `updatedById`)
SELECT
    jt.`managerId`,
    COALESCE(jt.`isBlocked`, FALSE),
    COALESCE(jt.`bonusPercent`, 0),
    COALESCE(jt.`updatedAt`, ac.`updatedAt`),
    jt.`updatedById`
FROM `AppConfig` ac
JOIN JSON_TABLE(
    ac.`value`,
    '$.managers[*]' COLUMNS (
        `managerId` VARCHAR(191) PATH '$.managerId',
        `isBlocked` BOOLEAN PATH '$.isBlocked' DEFAULT FALSE ON EMPTY,
        `bonusPercent` INTEGER PATH '$.bonusPercent' DEFAULT 0 ON EMPTY,
        `updatedAt` DATETIME(3) PATH '$.updatedAt' DEFAULT NULL ON EMPTY,
        `updatedById` VARCHAR(191) PATH '$.updatedById' DEFAULT NULL ON EMPTY
    )
) jt
WHERE ac.`key` = 'manager-access-control'
  AND jt.`managerId` IS NOT NULL
  AND jt.`managerId` <> '';

-- Add foreign keys
ALTER TABLE `PaymentWindowRule`
    ADD CONSTRAINT `PaymentWindowRule_settingsId_fkey`
    FOREIGN KEY (`settingsId`) REFERENCES `PaymentSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PricingSector`
    ADD CONSTRAINT `PricingSector_settingsId_fkey`
    FOREIGN KEY (`settingsId`) REFERENCES `PricingSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PricingDurationRule`
    ADD CONSTRAINT `PricingDurationRule_settingsId_fkey`
    FOREIGN KEY (`settingsId`) REFERENCES `PricingSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old JSON structures
ALTER TABLE `PaymentSettings` DROP COLUMN `paymentWindowRules`;
DROP TABLE `AppConfig`;
