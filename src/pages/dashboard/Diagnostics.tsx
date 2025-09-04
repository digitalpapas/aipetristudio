import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function DiagnosticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnosticResults: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    try {
      // 1. Check Supabase connection
      diagnosticResults.checks.push({
        name: 'Supabase Connection',
        status: 'checking'
      });
      
      const { data: testData, error: supabaseError } = await supabase
        .from('researches')
        .select('count')
        .limit(1);
      
      diagnosticResults.checks[0] = {
        name: 'Supabase Connection',
        status: supabaseError ? 'error' : 'success',
        message: supabaseError ? supabaseError.message : 'Connected successfully'
      };

      // 2. Check user authentication
      diagnosticResults.checks.push({
        name: 'User Authentication',
        status: user ? 'success' : 'warning',
        message: user ? `Authenticated as ${user.email}` : 'Not authenticated'
      });

      // 3. Test Edge Function availability
      diagnosticResults.checks.push({
        name: 'Edge Function Health',
        status: 'checking'
      });

      try {
        const { data, error } = await supabase.functions.invoke('direct-segment-analysis', {
          body: {
            test: true
          }
        });

        diagnosticResults.checks[2] = {
          name: 'Edge Function Health',
          status: error ? 'error' : 'success',
          message: error ? `Edge Function error: ${error.message}` : 'Edge Function responding'
        };

        if (data && !data.success && data.error) {
          // Проверяем специфичные ошибки
          if (data.error.includes('OPENAI_API_KEY')) {
            diagnosticResults.checks.push({
              name: 'OpenAI API Key',
              status: 'error',
              message: 'OpenAI API key not configured in Edge Function environment'
            });
          }
        }
      } catch (e) {
        diagnosticResults.checks[2] = {
          name: 'Edge Function Health',
          status: 'error',
          message: `Failed to invoke Edge Function: ${e.message}`
        };
      }

      // 4. Check OpenAI Assistants (если есть API ключ)
      if (user) {
        diagnosticResults.checks.push({
          name: 'OpenAI Assistants',
          status: 'checking'
        });

        try {
          // Делаем тестовый запрос к Edge Function с минимальными данными
          const { data, error } = await supabase.functions.invoke('test-assistant', {
            body: {
              userId: user.id
            }
          });

          if (error) {
            diagnosticResults.checks[3] = {
              name: 'OpenAI Assistants',
              status: 'error',
              message: `Failed to test assistants: ${error.message}`
            };
          } else if (data) {
            diagnosticResults.checks[3] = {
              name: 'OpenAI Assistants',
              status: data.success ? 'success' : 'error',
              message: data.message || 'Assistant check complete'
            };
          }
        } catch (e) {
          diagnosticResults.checks[3] = {
            name: 'OpenAI Assistants',
            status: 'error',
            message: `Assistant test failed: ${e.message}`
          };
        }
      }

      // 5. Check database tables
      const tables = ['researches', 'segments', 'top_segments'] as const;
      for (const table of tables) {
        const { error } = await supabase.from(table).select('count').limit(1);
        diagnosticResults.checks.push({
          name: `Table: ${table}`,
          status: error ? 'error' : 'success',
          message: error ? error.message : 'Table accessible'
        });
      }

    } catch (error) {
      console.error('Diagnostic error:', error);
      diagnosticResults.error = error.message;
    } finally {
      setResults(diagnosticResults);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Check system configuration and connectivity
            </p>
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running diagnostics...
                </>
              ) : (
                'Run Diagnostics'
              )}
            </Button>
          </div>

          {results && (
            <div className="space-y-3 mt-6">
              <div className="text-xs text-muted-foreground">
                Last run: {new Date(results.timestamp).toLocaleString()}
              </div>
              
              {results.checks.map((check: any, index: number) => (
                <Alert key={index} className={getStatusColor(check.status)}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <div className="font-medium">{check.name}</div>
                      <AlertDescription className="text-sm mt-1">
                        {check.message}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}

              {results.error && (
                <Alert className="border-red-500 bg-red-50">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <AlertDescription>
                    General error: {results.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Configuration Checklist:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ Supabase URL and anon key configured</li>
              <li>✓ Edge Functions deployed</li>
              <li>⚠️ OpenAI API key set in Edge Function environment</li>
              <li>⚠️ Assistant IDs configured correctly</li>
              <li>✓ Database tables created and accessible</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Make sure to set the OPENAI_API_KEY environment variable in your Supabase Edge Function settings.
              Go to Supabase Dashboard → Edge Functions → direct-segment-analysis → Settings → Environment Variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
