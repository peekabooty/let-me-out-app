-- AlterTable: add activation token fields to user (nullable, non-breaking)
ALTER TABLE "user" ADD COLUMN "activation_token_hash" VARCHAR(64);
ALTER TABLE "user" ADD COLUMN "activation_token_expires_at" TIMESTAMPTZ(6);

-- AlterTable: make password_hash nullable (users without password pending activation)
ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: change is_active default to false (new users start inactive until they activate)
ALTER TABLE "user" ALTER COLUMN "is_active" SET DEFAULT false;
