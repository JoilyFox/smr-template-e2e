export interface IGitProvider {
  getPullRequestDiff(
    prId: string,
    repository: string,
    token: string,
  ): Promise<string>;
  getPullRequestDetails(
    prId: string,
    repository: string,
    token: string,
  ): Promise<{ title: string; description: string; branchName: string }>;
  postComment(
    prId: string,
    repository: string,
    token: string,
    filePath: string,
    line: number,
    comment: string,
  ): Promise<void>;
}
