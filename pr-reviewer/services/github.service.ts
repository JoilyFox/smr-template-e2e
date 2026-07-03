import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IGitProvider } from '../interfaces/git-provider.interface';

@Injectable()
export class GitHubService implements IGitProvider {
  private getHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  async getPullRequestDiff(prId: string, repository: string, token: string): Promise<string> {
    const url = `https://api.github.com/repos/${repository}/pulls/${prId}`;
    const response = await axios.get(url, {
      headers: {
        ...this.getHeaders(token),
        Accept: 'application/vnd.github.v3.diff',
      },
      responseType: 'text',
    });
    return response.data;
  }

  async getPullRequestDetails(prId: string, repository: string, token: string): Promise<{ title: string; description: string; branchName: string }> {
    const url = `https://api.github.com/repos/${repository}/pulls/${prId}`;
    const response = await axios.get(url, { headers: this.getHeaders(token) });
    return {
      title: response.data.title || '',
      description: response.data.body || '',
      branchName: response.data.head?.ref || '',
    };
  }

  async postComment(prId: string, repository: string, token: string, filePath: string, line: number, comment: string): Promise<void> {
    // For local reviews, we can post a line review comment or issue comment.
    // Line-level comments require commit_id and position. We fall back to a simple issue-level comment
    // specifying the file and line, or construct a line-level pull request comment if the PR details are available.
    const detailsUrl = `https://api.github.com/repos/${repository}/pulls/${prId}`;
    const detailsResponse = await axios.get(detailsUrl, { headers: this.getHeaders(token) });
    const latestCommit = detailsResponse.data.head?.sha;

    try {
      const commentUrl = `https://api.github.com/repos/${repository}/pulls/${prId}/comments`;
      await axios.post(commentUrl, {
        body: comment,
        path: filePath,
        line: line,
        side: 'RIGHT',
        commit_id: latestCommit,
      }, { headers: this.getHeaders(token) });
    } catch (err: any) {
      // Fallback: post a standard PR issue comment if line comment fails
      const fallbackUrl = `https://api.github.com/repos/${repository}/issues/${prId}/comments`;
      await axios.post(fallbackUrl, {
        body: `**Review Comment on [${filePath}#L${line}](file:///${filePath})**:\n\n${comment}`,
      }, { headers: this.getHeaders(token) });
    }
  }
}
