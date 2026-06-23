/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Check } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLocation?: { lat: number; lng: number };
  customerAddress?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onLocationSelect, 
  initialLocation,
  customerAddress 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoogleMapsApiKey = async () => {
    try {
      console.log('🗺️ Fetching Google Maps API key...');
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('google_maps_api_key')
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error fetching API key:', error);
        throw error;
      }
      
      console.log('✅ API key fetch result:', data ? 'Found' : 'Not found');
      
      if (data && (data as any).google_maps_api_key) {
        setGoogleMapsApiKey((data as any).google_maps_api_key);
        await initializeMap((data as any).google_maps_api_key);
      } else {
        console.warn('⚠️ No Google Maps API key configured');
        setError('Google Maps API key not configured. Please contact your administrator.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error fetching Google Maps API key:', error);
      setError('Failed to load map configuration. Please try again.');
      setIsLoading(false);
    }
  };

  const initializeMap = async (apiKey: string) => {
    if (!mapContainer.current) {
      console.warn('⚠️ Map container not ready');
      return;
    }

    try {
      console.log('🗺️ Initializing Google Maps...');
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['geometry', 'geocoding']
      });

      console.log('📦 Loading Maps library...');
      const { Map } = await loader.importLibrary('maps') as google.maps.MapsLibrary;

      console.log('🗺️ Creating map instance...');
      map.current = new Map(mapContainer.current, {
        center: initialLocation ? initialLocation : { lat: 28.7041, lng: 77.1025 },
        zoom: initialLocation ? 15 : 10,
        mapTypeId: 'roadmap'
      });

      // Add click handler
      map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setSelectedLocation({ lat, lng });
          updateMarker(lat, lng);
        }
      });

      // If there's an initial location, add marker
      if (initialLocation) {
        updateMarker(initialLocation.lat, initialLocation.lng);
      }

      // Try to geocode the customer address
      if (customerAddress && !initialLocation) {
        geocodeAddress(customerAddress);
      }

      console.log('✅ Map loaded successfully');
      setIsMapLoaded(true);
      setIsLoading(false);
      setError(null);
    } catch (error: any) {
      console.error('❌ Error loading Google Maps:', error);
      
      let errorMessage = 'Failed to load map. ';
      if (error.message?.includes('ApiTargetBlockedMapError')) {
        errorMessage += 'Invalid API key or API not enabled.';
      } else if (error.message?.includes('RefererNotAllowedMapError')) {
        errorMessage += 'API key restrictions issue.';
      } else if (error.message?.includes('quota')) {
        errorMessage += 'API quota exceeded.';
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleMapsApiKey();
  }, []);

  const updateMarker = (lat: number, lng: number) => {
    if (!map.current) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.setMap(null);
    }

    // Add new marker
    marker.current = new google.maps.Marker({
      position: { lat, lng },
      map: map.current,
      title: 'Selected Location'
    });
  };

  const geocodeAddress = async (address: string) => {
    if (!googleMapsApiKey) return;
    
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          setSelectedLocation({ lat, lng });
          updateMarker(lat, lng);
          map.current?.setCenter({ lat, lng });
          map.current?.setZoom(15);
        }
      });
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.lat, selectedLocation.lng);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">Pick Location on Map</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
            <span className="text-muted-foreground ml-2">Loading map...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/50">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Map Loading Failed</span>
          </div>
          <p className="text-sm text-destructive">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchGoogleMapsApiKey();
            }}
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Pick Location on Map</span>
          </div>
          {selectedLocation && (
            <Button onClick={handleConfirmLocation} size="sm" className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              Confirm
            </Button>
          )}
        </div>
        
        <div 
          ref={mapContainer} 
          className="w-full h-[300px] rounded-lg border cursor-crosshair"
        />
        
        {selectedLocation && (
          <div className="text-xs text-muted-foreground">
            Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Click on the map to select the customer's exact location
        </p>
      </div>
    </Card>
  );
};

export default LocationPicker;