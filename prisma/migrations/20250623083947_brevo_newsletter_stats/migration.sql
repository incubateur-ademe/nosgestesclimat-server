-- CreateTable
CREATE TABLE "ngc"."BrevoNewsletterStats" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "newsletter" INTEGER NOT NULL,
    "subscriptions" INTEGER NOT NULL,

    CONSTRAINT "BrevoNewsletterStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrevoNewsletterStats_date_newsletter_key" ON "ngc"."BrevoNewsletterStats"("date", "newsletter");
