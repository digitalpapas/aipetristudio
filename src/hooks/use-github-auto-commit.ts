import { useCallback, useState } from 'react';
import { AutoCommitService, AutoCommitConfig } from '@/lib/auto-commit';

const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined') {
    return (window as any).__env__?.[key] || import.meta.env[key] || '';
  }
  return import.meta.env[key] || '';
};

export const useGitHubAutoCommit = () => {
  const [autoCommitService, setAutoCommitService] = useState<AutoCommitService | null>(() => {
    const config: AutoCommitConfig = {
      owner: getEnvVar('VITE_GITHUB_OWNER'),
      repo: getEnvVar('VITE_GITHUB_REPO'),
      token: getEnvVar('VITE_GITHUB_PAT'),
      enabled: getEnvVar('VITE_AUTO_COMMIT_ENABLED') === 'true',
      commitPrefix: getEnvVar('VITE_AUTO_COMMIT_PREFIX') || 'feat',
      autoCommitBranch: getEnvVar('VITE_AUTO_COMMIT_BRANCH') || 'main',
    };

    if (config.enabled && config.token && config.owner && config.repo) {
      return new AutoCommitService(config);
    }
    return null;
  });

  const commitFiles = useCallback(async (
    message: string,
    files: Array<{ path: string; content: string }>
  ) => {
    if (!autoCommitService) {
      console.warn('Auto-commit service not configured');
      return { success: false, reason: 'Service not configured' };
    }

    return await autoCommitService.commitChanges(message, files);
  }, [autoCommitService]);

  const isEnabled = useCallback(() => {
    return autoCommitService?.isEnabled() || false;
  }, [autoCommitService]);

  const updateConfig = useCallback((newConfig: Partial<AutoCommitConfig>) => {
    if (autoCommitService) {
      autoCommitService.updateConfig(newConfig);
    }
  }, [autoCommitService]);

  return {
    commitFiles,
    isEnabled,
    updateConfig,
    service: autoCommitService,
  };
};