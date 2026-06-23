/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Route, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone: string;
}

interface CustomerMapProps {
  customers: Customer[];
  onCustomerLocationUpdate?: (customerId: string, lat: number, lng: number) => void;
  onRouteOptimize?: (optimizedRoute: Customer[]) => void;
}

const CustomerMap: React.FC<CustomerMapProps> = ({ 
  customers, 
  onCustomerLocationUpdate,
  onRouteOptimize 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const markers = useRef<google.maps.Marker[]>([]);

  const fetchGoogleMapsApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('google_maps_api_key')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data && (data as any).google_maps_api_key) {
        setGoogleMapsApiKey((data as any).google_maps_api_key);
        initializeMap((data as any).google_maps_api_key);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching Google Maps API key:', error);
      setIsLoading(false);
    }
  };

  const initializeMap = async (apiKey: string) => {
    if (!mapContainer.current) return;

    try {
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['geometry']
      });

      const { Map } = await loader.importLibrary('maps') as google.maps.MapsLibrary;

      map.current = new Map(mapContainer.current, {
        center: { lat: 28.7041, lng: 77.1025 }, // Default to Delhi
        zoom: 10,
        mapTypeId: 'roadmap'
      });

      // Add click handler for adding customer locations
      map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          console.log('Clicked location:', { lat, lng });
        }
      });

      setIsMapLoaded(true);
      setIsLoading(false);
      updateMarkers();
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      setIsLoading(false);
    }
  };

  const updateMarkers = async () => {
    if (!map.current || !isMapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Add markers for customers with locations
    const bounds = new google.maps.LatLngBounds();
    let hasMarkers = false;

    customers.forEach((customer, index) => {
      if (customer.latitude && customer.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: customer.latitude, lng: customer.longitude },
          map: map.current,
          title: customer.name,
          label: {
            text: (index + 1).toString(),
            color: 'white',
            fontWeight: 'bold'
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0; font-weight: bold;">${customer.name}</h3>
              <p style="margin: 4px 0; color: #666;">${customer.address}</p>
              <p style="margin: 4px 0; color: #666;">${customer.phone}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map.current, marker);
        });

        markers.current.push(marker);
        bounds.extend({ lat: customer.latitude, lng: customer.longitude });
        hasMarkers = true;
      }
    });

    // Fit map to show all markers
    if (hasMarkers) {
      map.current.fitBounds(bounds);
    }
  };

  const optimizeRoute = () => {
    const customersWithLocations = customers.filter(c => c.latitude && c.longitude);
    if (customersWithLocations.length < 2) return;

    // Simple route optimization - sort by proximity (TSP approximation)
    const optimized = [...customersWithLocations];
    
    // Start from first customer and always go to nearest unvisited
    const result = [optimized[0]];
    const remaining = optimized.slice(1);
    
    while (remaining.length > 0) {
      const current = result[result.length - 1];
      let nearestIndex = 0;
      let minDistance = Infinity;
      
      remaining.forEach((customer, index) => {
        const distance = Math.sqrt(
          Math.pow(current.latitude! - customer.latitude!, 2) +
          Math.pow(current.longitude! - customer.longitude!, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = index;
        }
      });
      
      result.push(remaining[nearestIndex]);
      remaining.splice(nearestIndex, 1);
    }

    onRouteOptimize?.(result);
  };

  useEffect(() => {
    fetchGoogleMapsApiKey();
  }, []);

  useEffect(() => {
    if (isMapLoaded) {
      updateMarkers();
    }
  }, [customers, isMapLoaded]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Customer Map</h3>
          </div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </Card>
    );
  }

  if (!googleMapsApiKey) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Customer Map</h3>
          </div>
          <p className="text-muted-foreground">
            Google Maps API key not configured. Please contact your administrator to set up the Google Maps integration.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Customer Locations</h3>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {customers.filter(c => c.latitude && c.longitude).length} located
            </div>
            <Button 
              onClick={optimizeRoute}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
              disabled={customers.filter(c => c.latitude && c.longitude).length < 2}
            >
              <Route className="h-4 w-4" />
              Optimize Route
            </Button>
          </div>
        </div>
        <div 
          ref={mapContainer} 
          className="w-full h-[400px] rounded-lg border"
          style={{ minHeight: '400px' }}
        />
      </div>
    </Card>
  );
};

export default CustomerMap;