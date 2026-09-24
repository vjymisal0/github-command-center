import { Worker, type Job } from 'bullmq';
import { Octokit } from '@octokit/rest';
import { PrismaClient } from '@prisma/client';
import { decryptCredential, classifyActionReasons, type PullRequestFacts } from '@gcc/shared';

const prisma = new PrismaClient();
const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

interface SyncJobData {
  userId: string;
  connectionId: string;
}

export async function syncUserRepositoriesAndPRs(userId: string, connectionId: string, token: string) {
  const octokit = new Octokit({ auth: token });

  // 1. Get authenticated user login
  const { data: user } = await octokit.rest.users.getAuthenticated();

  // 2. Discover accessible repositories
  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 50,
    affiliation: 'owner,collaborator,organization_member',
    sort: 'updated',
  });

  console.log(`[Worker] Found ${repos.length} repositories for user ${user.login}`);

  for (const repo of repos) {
    try {
      const isOwner = repo.owner.login.toLowerCase() === user.login.toLowerCase();
      const dbRepo = await prisma.repository.upsert({
        where: { githubId: BigInt(repo.id) },
        update: {
          owner: repo.owner.login,
          name: repo.full_name,
          visibility: repo.private ? 'PRIVATE' : 'PUBLIC',
        },
        create: {
          githubId: BigInt(repo.id),
          owner: repo.owner.login,
          name: repo.full_name,
          visibility: repo.private ? 'PRIVATE' : 'PUBLIC',
        },
      });

      await prisma.userRepositoryAccess.upsert({
        where: {
          userId_repositoryId_connectionId: {
            userId,
            repositoryId: dbRepo.id,
            connectionId,
          },
        },
        update: {
          relationships: [isOwner ? 'OWNED' : 'COLLABORATING'],
          status: 'active',
          lastVerifiedAt: new Date(),
        },
        create: {
          userId,
          repositoryId: dbRepo.id,
          connectionId,
          relationships: [isOwner ? 'OWNED' : 'COLLABORATING'],
          status: 'active',
          lastVerifiedAt: new Date(),
        },
      });

      // 3. Fetch open PRs for repo (read-only)
      const { data: prList } = await octokit.rest.pulls.list({
        owner: repo.owner.login,
        repo: repo.name,
        state: 'open',
        per_page: 20,
      });

      for (const pr of prList) {
        const dbPr = await prisma.pullRequest.upsert({
          where: {
            repositoryId_number: {
              repositoryId: dbRepo.id,
              number: pr.number,
            },
          },
          update: {
            title: pr.title,
            authorLogin: pr.user?.login ?? 'unknown',
            state: pr.state === 'open' ? 'OPEN' : pr.merged_at ? 'MERGED' : 'CLOSED',
            draft: pr.draft ?? false,
            lastSyncedAt: new Date(),
          },
          create: {
            repositoryId: dbRepo.id,
            githubNodeId: pr.node_id,
            number: pr.number,
            title: pr.title,
            authorLogin: pr.user?.login ?? 'unknown',
            state: pr.state === 'open' ? 'OPEN' : pr.merged_at ? 'MERGED' : 'CLOSED',
            draft: pr.draft ?? false,
            openedAt: new Date(pr.created_at),
            lastSyncedAt: new Date(),
          },
        });

        // 4. Classify action items deterministically
        const reviewRequested = (pr.requested_reviewers ?? []).some(
          r => 'login' in r && r.login.toLowerCase() === user.login.toLowerCase()
        );

        const facts: PullRequestFacts = {
          authorLogin: pr.user?.login ?? '',
          currentUserLogin: user.login,
          draft: pr.draft ?? false,
          state: 'OPEN',
          reviewRequested,
        };

        const reasons = classifyActionReasons(facts);

        for (const reason of reasons) {
          await prisma.actionItem.upsert({
            where: {
              userId_pullRequestId_reason: {
                userId,
                pullRequestId: dbPr.id,
                reason,
              },
            },
            update: {
              lastSeenAt: new Date(),
            },
            create: {
              userId,
              pullRequestId: dbPr.id,
              reason,
              evidence: { triggeredAt: new Date().toISOString() },
            },
          });
        }
      }
    } catch (repoErr) {
      console.warn(`[Worker] Error syncing repo ${repo.full_name}:`, repoErr);
    }
  }
}

// BullMQ Worker implementation
export const worker = new Worker<SyncJobData>(
  'github-sync',
  async (job: Job<SyncJobData>) => {
    console.log(`[Worker] Processing sync job ${job.id}: ${job.name}`);
    const { userId, connectionId } = job.data;

    try {
      const encrypted = await prisma.encryptedCredential.findUnique({
        where: { connectionId },
      });

      if (!encrypted) {
        console.warn(`[Worker] No encrypted credential found for connection ${connectionId}`);
        return;
      }

      const token = decryptCredential({
        ciphertext: Buffer.from(encrypted.ciphertext),
        nonce: Buffer.from(encrypted.nonce),
        tag: Buffer.from(encrypted.tag),
      });

      await syncUserRepositoriesAndPRs(userId, connectionId, token);
      console.log(`[Worker] Completed sync for user ${userId}`);
    } catch (err) {
      console.error(`[Worker] Error processing job ${job.id}:`, err);
      throw err;
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

console.log('worker listening for github-sync jobs');
