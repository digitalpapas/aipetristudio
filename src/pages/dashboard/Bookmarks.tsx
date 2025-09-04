import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ArrowLeft, Trash2, FileText, Calendar, Hash } from "lucide-react";
import { getBookmarks, deleteBookmark } from "@/lib/supabase-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksPage() {
  const { researchId, segmentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [segmentName, setSegmentName] = useState<string>("");

  const loadSegmentName = async () => {
    if (!researchId || !segmentId) return;
    
    try {
      const { data, error } = await supabase
        .from('segments')
        .select('Название сегмента')
        .eq('Project ID', researchId)
        .eq('Сегмент ID', parseInt(segmentId))
        .single();
      
      if (!error && data) {
        setSegmentName(data['Название сегмента']);
      }
    } catch (error) {
      console.error('Error loading segment name:', error);
    }
  };

  useEffect(() => {
    loadBookmarks();
    loadSegmentName();
  }, [researchId, segmentId]);

  const loadBookmarks = async () => {
    try {
      const { data, error } = await getBookmarks(
        researchId,
        segmentId ? parseInt(segmentId) : undefined
      );
      
      if (error) {
        console.error('Error loading bookmarks:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить избранное",
          variant: "destructive"
        });
        return;
      }
      
      setBookmarks(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookmarkId: string) => {
    try {
      const { error } = await deleteBookmark(bookmarkId);
      
      if (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось удалить из избранного",
          variant: "destructive"
        });
        return;
      }
      
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      toast({
        title: "Удалено",
        description: "Элемент удален из избранного"
      });
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  const getAnalysisTypeTitle = (type: string) => {
    const titles: Record<string, string> = {
      'segment_description': 'Описание сегмента',
      'bdf_analysis': 'BDF анализ',
      'problems_analysis': 'Боли, страхи, потребности, возражения',
      'solutions_analysis': 'Работа с болями',
      'jtbd_analysis': 'JTBD анализ',
      'content_themes': 'Темы для контента',
      'user_personas': 'User personas',
      'niche_integration': 'Уровни интеграции с нишей',
      'final_report': 'Аналитический отчет'
    };
    return titles[type] || type;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/research/${researchId}/segment/${segmentId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к анализу
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark className="h-6 w-6" />
            Избранное для {segmentName || `сегмента ${segmentId}`}
          </h1>
        </div>
        <Badge variant="secondary">
          {bookmarks.length} элементов
        </Badge>
      </div>

      {bookmarks.length === 0 ? (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Вы пока не добавили ничего в избранное для этого сегмента
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Выделите интересный текст в анализе и нажмите "В избранное"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Badge variant="outline" className="mb-2">
                      {getAnalysisTypeTitle(bookmark.analysis_type)}
                    </Badge>
                    <CardTitle className="text-lg font-medium">
                      "{bookmark.selected_text}"
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(bookmark.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(bookmark.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {(bookmark.context_before || bookmark.context_after) && (
                <CardContent className="pt-0">
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    {bookmark.context_before && (
                      <span className="text-muted-foreground">...{bookmark.context_before}</span>
                    )}
                    <span className="font-medium text-foreground bg-yellow-100 dark:bg-yellow-900/30 px-1 mx-1 rounded">
                      {bookmark.selected_text}
                    </span>
                    {bookmark.context_after && (
                      <span className="text-muted-foreground">{bookmark.context_after}...</span>
                    )}
                  </div>
                  {bookmark.note && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm">{bookmark.note}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}