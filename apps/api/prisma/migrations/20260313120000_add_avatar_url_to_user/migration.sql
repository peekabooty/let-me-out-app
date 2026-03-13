-- AlterTable: add avatar URL for user profile photos
ALTER TABLE "user" ADD COLUMN "avatar_url" VARCHAR(500);
