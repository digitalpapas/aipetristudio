import { useCallback, useState } from 'react';
import { GitAutoCommitService, GitAutoCommitConfig } from '@/lib/git-auto-commit';

const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined') {
    return (window as any).__env__?.[key] || import.meta.env[key] || '';
  }
  return import.meta.env[key] || '';
};

export const useGitHubAutoCommit = () => {
  const [autoCommitService, setAutoCommitService] = useState<GitAutoCommitService | null>(() => {
    const config: GitAutoCommitConfig = {
      enabled: getEnvVar('VITE_AUTO_COMMIT_ENABLED') === 'true',
      commitPrefix: getEnvVar('VITE_AUTO_COMMIT_PREFIX') || 'feat',
      branch: getEnvVar('VITE_AUTO_COMMIT_BRANCH') || 'main',
      remote: 'origin',
    };

    if (config.enabled) {
      return new GitAutoCommitService(config);
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

  const updateConfig = useCallback((newConfig: Partial<GitAutoCommitConfig>) => {
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