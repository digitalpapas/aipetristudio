import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnterpriseContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnterpriseContactModal({ open, onOpenChange }: EnterpriseContactModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    team_size: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("enterprise_inquiries")
        .insert([formData]);

      if (error) throw error;

      toast("Спасибо! Мы свяжемся с вами в течение 24 часов.");
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        company: "",
        team_size: "",
        message: "",
      });
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      toast("Произошла ошибка при отправке. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Связаться с нами</DialogTitle>
          <DialogDescription>
            Заполните форму ниже, и мы свяжемся с вами для обсуждения Enterprise тарифа.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Компания</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team_size">Размер команды *</Label>
            <Select
              value={formData.team_size}
              onValueChange={(value) => handleInputChange("team_size", value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите размер команды" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5-10">5-10 человек</SelectItem>
                <SelectItem value="10-25">10-25 человек</SelectItem>
                <SelectItem value="25-50">25-50 человек</SelectItem>
                <SelectItem value="50+">50+ человек</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Сообщение</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              placeholder="Расскажите о ваших потребностях..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Отправка..." : "Отправить запрос"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}