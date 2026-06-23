import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, PartyPopper } from "lucide-react";

interface UpdateBirthdayModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  currentBirthday?: string;
}

export function UpdateBirthdayModal({ isOpen, onClose, customerId, currentBirthday }: UpdateBirthdayModalProps) {
  const { toast } = useToast();
  const [birthday, setBirthday] = useState(currentBirthday || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!birthday) {
      toast({
        title: "Error",
        description: "Please select your birthday",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("customers")
        .update({ birthday })
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Birthday updated successfully! You'll receive bonus points on your special day.",
      });

      onClose();
    } catch (error: any) {
      console.error("Error updating birthday:", error);
      toast({
        title: "Error",
        description: "Failed to update birthday. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            Update Birthday
          </DialogTitle>
          <DialogDescription>
            Set your birthday to receive automatic loyalty point rewards on your special day!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <div className="relative">
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="pl-10"
                required
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2 text-foreground">Birthday Rewards by Tier:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>🥉 Bronze: 50 points</li>
              <li>🥈 Silver: 100 points</li>
              <li>🥇 Gold: 200 points</li>
              <li>💎 Platinum: 500 points</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Birthday"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
