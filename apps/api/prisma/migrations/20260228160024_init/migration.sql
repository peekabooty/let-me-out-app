-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_type" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(10) NOT NULL,
    "max_per_year" DECIMAL(6,2) NOT NULL,
    "min_duration" DECIMAL(6,2) NOT NULL,
    "max_duration" DECIMAL(6,2) NOT NULL,
    "requires_validation" BOOLEAN NOT NULL DEFAULT false,
    "allow_past_dates" BOOLEAN NOT NULL DEFAULT false,
    "min_days_in_advance" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "absence_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "absence_type_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "duration" DECIMAL(6,2) NOT NULL,
    "status" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_validation_history" (
    "id" UUID NOT NULL,
    "absence_id" UUID NOT NULL,
    "validator_id" UUID NOT NULL,
    "decision" VARCHAR(20) NOT NULL,
    "decided_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_validation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_status_history" (
    "id" UUID NOT NULL,
    "absence_id" UUID NOT NULL,
    "from_status" VARCHAR(50),
    "to_status" VARCHAR(50) NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation" (
    "id" UUID NOT NULL,
    "absence_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "absence_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("team_id","user_id")
);

-- CreateTable
CREATE TABLE "observation_attachment" (
    "id" UUID NOT NULL,
    "observation_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "stored_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observation_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "absence_user_id_idx" ON "absence"("user_id");

-- CreateIndex
CREATE INDEX "absence_absence_type_id_idx" ON "absence"("absence_type_id");

-- CreateIndex
CREATE INDEX "absence_validation_history_absence_id_idx" ON "absence_validation_history"("absence_id");

-- CreateIndex
CREATE INDEX "absence_validation_history_validator_id_idx" ON "absence_validation_history"("validator_id");

-- CreateIndex
CREATE INDEX "absence_status_history_absence_id_idx" ON "absence_status_history"("absence_id");

-- CreateIndex
CREATE INDEX "absence_status_history_changed_by_idx" ON "absence_status_history"("changed_by");

-- CreateIndex
CREATE INDEX "observation_absence_id_idx" ON "observation"("absence_id");

-- CreateIndex
CREATE INDEX "observation_user_id_idx" ON "observation"("user_id");

-- CreateIndex
CREATE INDEX "notification_user_id_idx" ON "notification"("user_id");

-- CreateIndex
CREATE INDEX "notification_absence_id_idx" ON "notification"("absence_id");

-- CreateIndex
CREATE INDEX "team_member_user_id_idx" ON "team_member"("user_id");

-- CreateIndex
CREATE INDEX "observation_attachment_observation_id_idx" ON "observation_attachment"("observation_id");

-- AddForeignKey
ALTER TABLE "absence" ADD CONSTRAINT "absence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence" ADD CONSTRAINT "absence_absence_type_id_fkey" FOREIGN KEY ("absence_type_id") REFERENCES "absence_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_validation_history" ADD CONSTRAINT "absence_validation_history_absence_id_fkey" FOREIGN KEY ("absence_id") REFERENCES "absence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_validation_history" ADD CONSTRAINT "absence_validation_history_validator_id_fkey" FOREIGN KEY ("validator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_status_history" ADD CONSTRAINT "absence_status_history_absence_id_fkey" FOREIGN KEY ("absence_id") REFERENCES "absence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_status_history" ADD CONSTRAINT "absence_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation" ADD CONSTRAINT "observation_absence_id_fkey" FOREIGN KEY ("absence_id") REFERENCES "absence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation" ADD CONSTRAINT "observation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_absence_id_fkey" FOREIGN KEY ("absence_id") REFERENCES "absence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_attachment" ADD CONSTRAINT "observation_attachment_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
