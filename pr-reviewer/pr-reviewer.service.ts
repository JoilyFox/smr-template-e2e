import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { GitProviderFactory } from './services/git-provider.factory';
import { JiraService } from './services/jira.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { ReviewReport, ReviewConfig, ReviewIssue } from './interfaces/review-report.interface';

@Injectable()
export class PrReviewerService {
  constructor(
    private readonly gitProviderFactory: GitProviderFactory,
    private readonly jiraService: JiraService,
    private readonly agentOrchestratorService: AgentOrchestratorService,
  ) {}

  private loadConfig(): ReviewConfig {
    const configPath = path.join(process.cwd(), 'pr-reviewer', 'pr-reviewer.config.json');
    if (!fs.existsSync(configPath)) {
      throw new InternalServerErrorException(`PR Reviewer config not found at ${configPath}`);
    }
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as ReviewConfig;
  }

  async generateReport(prId: string): Promise<ReviewReport> {
    const config = this.loadConfig();
    const gitToken = process.env.GIT_PROVIDER_TOKEN || '';
    const jiraEmail = process.env.JIRA_EMAIL || '';
    const jiraToken = process.env.JIRA_API_TOKEN || '';
    const gitProvider = this.gitProviderFactory.getProvider(config.git.provider);
    const apiKey = config.ai.provider === 'gemini'
      ? (process.env.GEMINI_API_KEY || '')
      : (process.env.ANTHROPIC_API_KEY || '');

    // 1. Fetch Pull Request metadata and diff
    console.log(`[PR Reviewer] Fetching PR #${prId} details from ${config.git.provider}...`);
    const prDetails = await gitProvider.getPullRequestDetails(prId, config.git.repository, gitToken);
    const diff = await gitProvider.getPullRequestDiff(prId, config.git.repository, gitToken);

    // 2. Fetch Jira ticket context if enabled and referenced
    let jiraContext = '';
    if (config.jira.enabled && config.jira.ticketRegex) {
      const regex = new RegExp(config.jira.ticketRegex, 'i');
      const ticketMatch = prDetails.branchName.match(regex) || prDetails.title.match(regex);

      if (ticketMatch && ticketMatch[0]) {
        const ticketId = ticketMatch[0].toUpperCase();
        console.log(`[PR Reviewer] Found linked Jira ticket: ${ticketId}. Fetching details...`);
        jiraContext = await this.jiraService.getTicketDetails(ticketId, config.jira.baseUrl, jiraEmail, jiraToken);
      } else {
        console.log('[PR Reviewer] No Jira ticket keys found in branch name or PR title.');
      }
    }

    // 3. Invoke AI review agent orchestrator
    console.log('[PR Reviewer] Invoking LLM agents to critique PR code changes...');
    const issues = await this.agentOrchestratorService.runReview(
      diff,
      jiraContext,
      apiKey,
      config.ai.provider,
      config.ai.model,
    );

    // 4. Filter issues based on config rules
    const filteredIssues = issues.filter(issue => issue.score >= config.rules.minScoreToSuggest);

    return {
      issues: filteredIssues,
      config,
    };
  }

  async postComment(prId: string, issue: ReviewIssue): Promise<void> {
    const config = this.loadConfig();
    const gitToken = process.env.GIT_PROVIDER_TOKEN || '';
    const gitProvider = this.gitProviderFactory.getProvider(config.git.provider);

    const formattedComment = `
### 🤖 AI PR Review Critique
**Severity Score**: ${issue.score}/100 | **Category**: ${issue.category.toUpperCase()}

**Description**:
${issue.description}

*Justification*: ${issue.justification}
`;

    await gitProvider.postComment(
      prId,
      config.git.repository,
      gitToken,
      issue.filePath,
      issue.line,
      formattedComment,
    );
  }
}
