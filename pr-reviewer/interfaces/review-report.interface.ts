export interface ReviewIssue {
  filePath: string;
  line: number;
  category: 'security' | 'architecture' | 'bug' | 'performance' | 'style';
  description: string;
  score: number; // 1 to 100
  justification: string;
}

export interface ReviewConfig {
  git: {
    provider: 'github' | 'gitlab' | 'bitbucket';
    repository: string;
    mainBranch: string;
  };
  jira: {
    enabled: boolean;
    baseUrl: string;
    projectKey: string;
    ticketRegex: string;
  };
  ai: {
    provider: string;
    model: string;
  };
  rules: {
    minScoreToSuggest: number;
    minScoreToPrompt: number;
    minScoreToAutoComment: number;
  };
}

export interface ReviewReport {
  issues: ReviewIssue[];
  config: ReviewConfig;
}
