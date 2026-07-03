export interface IGitProvider {
  getPullRequestDiff(prId: string): Promise<string>;
  getPullRequestDetails(prId: string): Promise<{ title: string; description: string; branchName: string }>;
  postComment(prId: string, filePath: string, line: number, comment: string): Promise<void>;
}
