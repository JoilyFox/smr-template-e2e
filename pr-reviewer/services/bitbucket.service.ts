import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IGitProvider } from '../interfaces/git-provider.interface';

@Injectable()
export class BitbucketService implements IGitProvider {
  private getHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }

  async getPullRequestDiff(prId: string, repository: string, token: string): Promise<string> {
    // repository typically is 'workspace/repo-slug'
    const url = `https://api.bitbucket.org/2.0/repositories/${repository}/pullrequests/${prId}/diff`;
    const response = await axios.get(url, {
      headers: this.getHeaders(token),
      responseType: 'text',
    });
    return response.data;
  }

  async getPullRequestDetails(prId: string, repository: string, token: string): Promise<{ title: string; description: string; branchName: string }> {
    const url = `https://api.bitbucket.org/2.0/repositories/${repository}/pullrequests/${prId}`;
    const response = await axios.get(url, { headers: this.getHeaders(token) });
    return {
      title: response.data.title || '',
      description: response.data.description || '',
      branchName: response.data.source?.branch?.name || '',
    };
  }

  async postComment(prId: string, repository: string, token: string, filePath: string, line: number, comment: string): Promise<void> {
    try {
      const url = `https://api.bitbucket.org/2.0/repositories/${repository}/pullrequests/${prId}/comments`;
      await axios.post(url, {
        content: {
          raw: comment
        },
        inline: {
          path: filePath,
          to: line
        }
      }, { headers: this.getHeaders(token) });
    } catch (err: any) {
      // Fallback: general comment
      const fallbackUrl = `https://api.bitbucket.org/2.0/repositories/${repository}/pullrequests/${prId}/comments`;
      await axios.post(fallbackUrl, {
        content: {
          raw: `**Review Comment on [${filePath}#L${line}](file:///${filePath})**:\n\n${comment}`
        }
      }, { headers: this.getHeaders(token) });
    }
  }
}
