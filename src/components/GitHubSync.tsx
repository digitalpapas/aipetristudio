import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useGitHubAutoCommit } from '@/hooks/use-github-auto-commit';
import { Badge } from '@/components/ui/badge';

export function GitHubSync() {
  const { commitFiles, isEnabled, updateConfig } = useGitHubAutoCommit();
  const [testMessage, setTestMessage] = useState('Test commit from Deep Scope AI');
  const [commitStatus, setCommitStatus] = useState<'idle' | 'committing' | 'success' | 'error'>('idle');

  const handleTestCommit = async () => {
    setCommitStatus('committing');
    
    const testFile = {
      path: `test-commits/test-${Date.now()}.md`,
      content: `# Test Commit\n\nCreated at: ${new Date().toISOString()}\nMessage: ${testMessage}\n`
    };

    const result = await commitFiles(testMessage, [testFile]);
    
    if (result.success) {
      setCommitStatus('success');
      setTimeout(() => setCommitStatus('idle'), 3000);
    } else {
      setCommitStatus('error');
      setTimeout(() => setCommitStatus('idle'), 5000);
    }
  };

  const getStatusColor = () => {
    switch (commitStatus) {
      case 'committing': return 'bg-yellow-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (commitStatus) {
      case 'committing': return 'Создание коммита...';
      case 'success': return 'Коммит успешно создан';
      case 'error': return 'Ошибка создания коммита';
      default: return 'Готов к коммиту';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          GitHub Синхронизация
          <Badge variant={isEnabled() ? 'default' : 'secondary'}>
            {isEnabled() ? 'Включено' : 'Отключено'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Автоматические коммиты изменений в GitHub
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={isEnabled()}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
          <Label>Автоматические коммиты</Label>
        </div>

        {isEnabled() && (
          <>
            <div className="space-y-2">
              <Label htmlFor="test-message">Тестовое сообщение коммита</Label>
              <Input
                id="test-message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Введите сообщение для тестового коммита"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
              <span className="text-sm">{getStatusText()}</span>
            </div>

            <Button 
              onClick={handleTestCommit}
              disabled={commitStatus === 'committing' || !testMessage.trim()}
              className="w-full"
            >
              {commitStatus === 'committing' ? 'Создание коммита...' : 'Тест коммита'}
            </Button>
          </>
        )}

        {!isEnabled() && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              Настройте GitHub интеграцию в .env файле:
              <br />• VITE_GITHUB_PAT
              <br />• VITE_GITHUB_OWNER  
              <br />• VITE_GITHUB_REPO
              <br />• VITE_AUTO_COMMIT_ENABLED=true
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}