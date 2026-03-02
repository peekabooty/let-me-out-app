-- CreateTable
CREATE TABLE "absence_validator" (
    "absence_id" UUID NOT NULL,
    "validator_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_validator_pkey" PRIMARY KEY ("absence_id","validator_id")
);

-- CreateIndex
CREATE INDEX "absence_validator_validator_id_idx" ON "absence_validator"("validator_id");

-- AddForeignKey
ALTER TABLE "absence_validator" ADD CONSTRAINT "absence_validator_absence_id_fkey" FOREIGN KEY ("absence_id") REFERENCES "absence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_validator" ADD CONSTRAINT "absence_validator_validator_id_fkey" FOREIGN KEY ("validator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
