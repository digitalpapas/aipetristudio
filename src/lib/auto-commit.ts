import { GitHubIntegration, GitHubConfig } from './github-integration';

export interface AutoCommitConfig extends GitHubConfig {
  enabled: boolean;
  commitPrefix?: string;
  autoCommitBranch?: string;
}

export class AutoCommitService {
  private github: GitHubIntegration | null = null;
  private config: AutoCommitConfig;

  constructor(config: AutoCommitConfig) {
    this.config = config;
    if (config.enabled && config.token) {
      this.github = new GitHubIntegration(config);
    }
  }

  async commitChanges(
    message: string,
    changedFiles: Array<{ path: string; content: string }>
  ) {
    if (!this.github || !this.config.enabled) {
      console.log('Auto-commit disabled or not configured');
      return { success: false, reason: 'Auto-commit disabled' };
    }

    const commitMessage = this.config.commitPrefix 
      ? `${this.config.commitPrefix}: ${message}` 
      : message;

    try {
      const result = await this.github.createCommit(
        commitMessage,
        changedFiles,
        this.config.autoCommitBranch || 'main'
      );

      if (result.success) {
        console.log(`✅ Auto-commit successful: ${result.url}`);
      } else {
        console.error(`❌ Auto-commit failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error('Auto-commit service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.github;
  }

  updateConfig(newConfig: Partial<AutoCommitConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.config.enabled && this.config.token) {
      this.github = new GitHubIntegration(this.config);
    } else {
      this.github = null;
    }
  }
}

export const createAutoCommitService = (config: AutoCommitConfig) => {
  return new AutoCommitService(config);
};