import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LocationPicker from '@/components/map/LocationPicker';

interface UpdateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  currentLocation?: { lat: number; lng: number };
  customerAddress?: string;
  onLocationUpdated?: () => void;
}

export const UpdateLocationModal = ({ 
  isOpen, 
  onClose, 
  customerId,
  currentLocation,
  customerAddress,
  onLocationUpdated 
}: UpdateLocationModalProps) => {
  const [location, setLocation] = useState(currentLocation || null);
  const [locationNotes, setLocationNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLocationSelect = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  const handleSave = async () => {
    if (!location) {
      toast({
        title: "Error",
        description: "Please select a location on the map",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          latitude: location.lat,
          longitude: location.lng,
          location_notes: locationNotes || null
        })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Location Updated",
        description: "Customer location has been updated successfully"
      });

      onLocationUpdated?.();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update location",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Customer Location</DialogTitle>
          <DialogDescription>
            Click on the map to set the precise delivery location
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location_notes">Location Notes</Label>
            <Input
              id="location_notes"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="e.g., 2nd floor, near main gate"
            />
          </div>
          
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            initialLocation={currentLocation}
            customerAddress={customerAddress}
          />

          {location && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Location:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
