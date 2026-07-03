import { Module } from '@nestjs/common';
import { PrReviewerService } from './pr-reviewer.service';
import { GitHubService } from './services/github.service';
import { GitLabService } from './services/gitlab.service';
import { BitbucketService } from './services/bitbucket.service';
import { GitProviderFactory } from './services/git-provider.factory';
import { JiraService } from './services/jira.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';

@Module({
  providers: [
    PrReviewerService,
    GitHubService,
    GitLabService,
    BitbucketService,
    GitProviderFactory,
    JiraService,
    AgentOrchestratorService,
  ],
  exports: [PrReviewerService],
})
export class PrReviewerModule {}
