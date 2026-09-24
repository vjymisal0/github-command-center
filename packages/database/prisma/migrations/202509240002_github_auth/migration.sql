ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "githubUserId" BIGINT;
ALTER TABLE "User" ADD COLUMN "githubLogin" TEXT;
CREATE UNIQUE INDEX "User_githubUserId_key" ON "User"("githubUserId");
