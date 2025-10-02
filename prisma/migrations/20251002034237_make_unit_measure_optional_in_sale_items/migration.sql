-- DropForeignKey
ALTER TABLE "public"."sale_items" DROP CONSTRAINT "sale_items_unitMeasureId_fkey";

-- AlterTable
ALTER TABLE "public"."sale_items" ALTER COLUMN "unitMeasureId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "public"."unit_measures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
