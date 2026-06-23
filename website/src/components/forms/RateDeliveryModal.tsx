import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ratingSchema, type RatingFormData } from "@/lib/validations";
import { SuccessOverlay } from "@/components/ui/success-animation";

interface Order {
  id: string;
  product_id: string;
  dairy_id: string;
  delivery_date: string;
  products?: {
    name: string;
  };
}

interface RateDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customerId: string;
}

export function RateDeliveryModal({ isOpen, onClose, order, customerId }: RateDeliveryModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<RatingFormData>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      deliveryRating: 0,
      productRating: 0,
      deliveryFeedback: "",
      productFeedback: "",
    },
  });

  const handleSubmit = async (data: RatingFormData) => {
    if (!order) return;

    if (data.deliveryRating === 0 || data.productRating === 0) {
      toast({
        title: "Ratings Required",
        description: "Please provide both delivery and product ratings.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("delivery_ratings").insert({
        order_id: order.id,
        customer_id: customerId,
        dairy_id: order.dairy_id,
        delivery_rating: data.deliveryRating,
        product_rating: data.productRating,
        delivery_feedback: data.deliveryFeedback || null,
        product_feedback: data.productFeedback || null,
      });

      if (error) throw error;

      // Show success animation
      setShowSuccess(true);
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ 
    value, 
    onChange 
  }: { 
    value: number; 
    onChange: (rating: number) => void;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    toast({
      title: "Thank you!",
      description: "Your feedback has been submitted successfully.",
    });
    form.reset();
    onClose();
  };

  return (
    <>
      <SuccessOverlay 
        show={showSuccess} 
        message="Thank you for your feedback!" 
        type="celebration"
        onComplete={handleSuccessComplete}
      />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Delivery</DialogTitle>
          </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {order && (
              <div className="text-sm text-muted-foreground">
                <p>Product: {order.products?.name}</p>
                <p>Delivered on: {new Date(order.delivery_date).toLocaleDateString()}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="deliveryRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Service Rating</FormLabel>
                  <FormControl>
                    <StarRating value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Quality Rating</FormLabel>
                  <FormControl>
                    <StarRating value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Share your thoughts about the delivery service..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Share your thoughts about the product quality..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </form>
        </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
