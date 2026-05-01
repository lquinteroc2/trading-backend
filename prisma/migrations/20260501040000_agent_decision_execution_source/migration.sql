CREATE TYPE "AgentExecutionSource" AS ENUM ('QUEUE', 'MANUAL');

ALTER TABLE "AgentDecision"
ADD COLUMN "executionSource" "AgentExecutionSource" NOT NULL DEFAULT 'MANUAL';
