import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IGitProvider } from '../interfaces/git-provider.interface';

@Injectable()
export class GitLabService implements IGitProvider {
  private getHeaders(token: string) {
    return {
      'PRIVATE-TOKEN': token,
    };
  }

  // Helper to url encode project path (e.g. 'group/project' -> 'group%2Fproject')
  private encodeProject(repository: string): string {
    return encodeURIComponent(repository);
  }

  async getPullRequestDiff(prId: string, repository: string, token: string): Promise<string> {
    const encoded = this.encodeProject(repository);
    const url = `https://gitlab.com/api/v4/projects/${encoded}/merge_requests/${prId}/changes`;
    const response = await axios.get(url, { headers: this.getHeaders(token) });
    
    // Construct pseudo diff format from the changes object if raw diff is not simple to fetch
    const changes = response.data.changes || [];
    return changes.map((c: any) => `--- a/${c.old_path}\n+++ b/${c.new_path}\n${c.diff}`).join('\n');
  }

  async getPullRequestDetails(prId: string, repository: string, token: string): Promise<{ title: string; description: string; branchName: string }> {
    const encoded = this.encodeProject(repository);
    const url = `https://gitlab.com/api/v4/projects/${encoded}/merge_requests/${prId}`;
    const response = await axios.get(url, { headers: this.getHeaders(token) });
    return {
      title: response.data.title || '',
      description: response.data.description || '',
      branchName: response.data.source_branch || '',
    };
  }

  async postComment(prId: string, repository: string, token: string, filePath: string, line: number, comment: string): Promise<void> {
    const encoded = this.encodeProject(repository);
    
    try {
      // Create a discussions thread
      const url = `https://gitlab.com/api/v4/projects/${encoded}/merge_requests/${prId}/discussions`;
      await axios.post(url, {
        body: comment,
        position: {
          position_type: 'text',
          new_path: filePath,
          new_line: line
        }
      }, { headers: this.getHeaders(token) });
    } catch (err: any) {
      // Fallback to simple note
      const fallbackUrl = `https://gitlab.com/api/v4/projects/${encoded}/merge_requests/${prId}/notes`;
      await axios.post(fallbackUrl, {
        body: `**Review Comment on [${filePath}#L${line}](file:///${filePath})**:\n\n${comment}`,
      }, { headers: this.getHeaders(token) });
    }
  }
}
