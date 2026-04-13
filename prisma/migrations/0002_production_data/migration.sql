-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `clientUserId` VARCHAR(191) NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NOT NULL,
    `clientPhoneKey` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `durationHours` INTEGER NOT NULL,
    `pricePerHour` INTEGER NOT NULL,
    `totalPrice` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `paymentStatus` VARCHAR(191) NOT NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `paymentProofUrl` VARCHAR(191) NULL,
    `paymentProofUploadedAt` DATETIME(3) NULL,
    `adminDecisionDueAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `paymentDueAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `notes` TEXT NOT NULL,

    INDEX `Booking_clientUserId_idx`(`clientUserId`),
    INDEX `Booking_clientPhoneKey_idx`(`clientPhoneKey`),
    INDEX `Booking_date_sector_idx`(`date`, `sector`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientDiscount` (
    `clientPhoneKey` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NOT NULL,
    `discountPercent` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    PRIMARY KEY (`clientPhoneKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientNotification` (
    `id` VARCHAR(191) NOT NULL,
    `clientUserId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `phoneKey` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL,

    INDEX `ClientNotification_clientUserId_idx`(`clientUserId`),
    INDEX `ClientNotification_phoneKey_idx`(`phoneKey`),
    INDEX `ClientNotification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientReview` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `clientUserId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `phoneKey` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    INDEX `ClientReview_bookingId_idx`(`bookingId`),
    INDEX `ClientReview_clientUserId_idx`(`clientUserId`),
    INDEX `ClientReview_phoneKey_idx`(`phoneKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentSettings` (
    `id` VARCHAR(191) NOT NULL,
    `adminDecisionHours` INTEGER NOT NULL,
    `paymentWindowRules` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralAssignment` (
    `clientPhoneKey` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NOT NULL,
    `managerId` VARCHAR(191) NOT NULL,
    `managerLogin` VARCHAR(191) NOT NULL,
    `managerName` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL,
    `assignedById` VARCHAR(191) NULL,

    INDEX `ReferralAssignment_managerId_idx`(`managerId`),
    PRIMARY KEY (`clientPhoneKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
    `id` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_login_key`(`login`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppConfig` (
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
