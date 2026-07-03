import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitLabService } from './gitlab.service';
import { BitbucketService } from './bitbucket.service';
import { IGitProvider } from '../interfaces/git-provider.interface';

@Injectable()
export class GitProviderFactory {
  constructor(
    private readonly githubService: GitHubService,
    private readonly gitlabService: GitLabService,
    private readonly bitbucketService: BitbucketService,
  ) {}

  getProvider(providerName: 'github' | 'gitlab' | 'bitbucket'): IGitProvider {
    switch (providerName) {
      case 'github':
        return this.githubService;
      case 'gitlab':
        return this.gitlabService;
      case 'bitbucket':
        return this.bitbucketService;
      default:
        throw new InternalServerErrorException(`Unsupported git provider: ${providerName}`);
    }
  }
}
