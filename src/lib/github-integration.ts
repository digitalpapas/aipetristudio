import { Octokit } from 'octokit';

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
}

export class GitHubIntegration {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  async createCommit(
    message: string,
    files: Array<{ path: string; content: string }>,
    branch: string = this.config.branch || 'main'
  ) {
    try {
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `heads/${branch}`,
      });

      const { data: commit } = await this.octokit.rest.git.getCommit({
        owner: this.config.owner,
        repo: this.config.repo,
        commit_sha: ref.object.sha,
      });

      const tree = await this.createTree(files, commit.tree.sha);

      const { data: newCommit } = await this.octokit.rest.git.createCommit({
        owner: this.config.owner,
        repo: this.config.repo,
        message,
        tree: tree.sha,
        parents: [commit.sha],
      });

      await this.octokit.rest.git.updateRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });

      return {
        success: true,
        sha: newCommit.sha,
        url: newCommit.html_url,
      };
    } catch (error) {
      console.error('GitHub commit error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async createTree(
    files: Array<{ path: string; content: string }>,
    baseTreeSha: string
  ) {
    const tree = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await this.octokit.rest.git.createBlob({
          owner: this.config.owner,
          repo: this.config.repo,
          content: file.content,
          encoding: 'utf-8',
        });

        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );

    const { data: newTree } = await this.octokit.rest.git.createTree({
      owner: this.config.owner,
      repo: this.config.repo,
      base_tree: baseTreeSha,
      tree,
    });

    return newTree;
  }

  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ) {
    try {
      const { data } = await this.octokit.rest.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
        head,
        base,
      });

      return {
        success: true,
        number: data.number,
        url: data.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getRepository() {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}