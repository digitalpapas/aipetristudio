import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        setConnectionStatus('error');
        setError(error.message);
      } else {
        setConnectionStatus('connected');
        console.log('Supabase connection successful:', data);
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'checking': return 'bg-yellow-500';
      case 'connected': return 'bg-green-500';
      case 'error': return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'checking': return 'Проверка подключения...';
      case 'connected': return 'Подключено к Supabase';
      case 'error': return 'Ошибка подключения';
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Тест подключения к Supabase</h3>
      
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span>{getStatusText()}</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-800 text-sm">Ошибка: {error}</p>
        </div>
      )}

      <Button onClick={testConnection} variant="outline">
        Проверить заново
      </Button>
    </div>
  );
}