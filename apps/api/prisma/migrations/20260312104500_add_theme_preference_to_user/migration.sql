-- AlterTable: add theme preference with default light
ALTER TABLE "user" ADD COLUMN "theme_preference" VARCHAR(20) DEFAULT 'light';
