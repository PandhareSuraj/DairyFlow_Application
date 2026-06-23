import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, ExternalLink, Key, TestTube2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemSettingsModal = ({ isOpen, onClose }: SystemSettingsModalProps) => {
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [currentKeyStatus, setCurrentKeyStatus] = useState<'configured' | 'not_configured' | 'loading'>('loading');
  const { toast } = useToast();

  const fetchCurrentSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('google_maps_api_key')
        .maybeSingle();

      if (error) throw error;

      if (data?.google_maps_api_key) {
        setGoogleMapsApiKey(data.google_maps_api_key);
        setCurrentKeyStatus('configured');
      } else {
        setCurrentKeyStatus('not_configured');
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setCurrentKeyStatus('not_configured');
      toast({
        title: "Error",
        description: "Failed to load current settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testGoogleMapsApiKey = async () => {
    if (!googleMapsApiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid Google Maps API key",
        variant: "destructive",
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      // Test the API key by making a simple geocoding request
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=${googleMapsApiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        setTestResult('success');
        toast({
          title: "Success",
          description: "Google Maps API key is valid and working",
        });
      } else {
        setTestResult('error');
        toast({
          title: "API Key Invalid",
          description: `Google Maps API test failed: ${data.error_message || data.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult('error');
      toast({
        title: "Test Failed",
        description: "Failed to test Google Maps API key",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async () => {
    if (!googleMapsApiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid Google Maps API key",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // First check if a record exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            google_maps_api_key: googleMapsApiKey,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('system_settings')
          .insert({ google_maps_api_key: googleMapsApiKey });

        if (error) throw error;
      }

      setCurrentKeyStatus('configured');
      toast({
        title: "Success",
        description: "Google Maps API key saved successfully",
      });
      onClose();
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast({
        title: "Error",
        description: "Failed to save system settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearApiKey = () => {
    setGoogleMapsApiKey('');
    setTestResult(null);
  };

  useEffect(() => {
    if (isOpen) {
      fetchCurrentSettings();
      setTestResult(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            System Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                Google Maps API Configuration
                <Badge variant={currentKeyStatus === 'configured' ? 'default' : 'secondary'}>
                  {currentKeyStatus === 'loading' ? 'Loading...' : 
                   currentKeyStatus === 'configured' ? 'Configured' : 'Not Configured'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Configure your Google Maps API key to enable location services and mapping features.
                <br />
                <a 
                  href="https://developers.google.com/maps/documentation/javascript/get-api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
                >
                  Get your API key from Google Cloud Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="google-maps-api-key">Google Maps API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="google-maps-api-key"
                    type="password"
                    placeholder="Enter your Google Maps API key"
                    value={googleMapsApiKey}
                    onChange={(e) => {
                      setGoogleMapsApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    disabled={loading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearApiKey}
                    disabled={loading || !googleMapsApiKey}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testGoogleMapsApiKey}
                  disabled={testing || !googleMapsApiKey.trim()}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube2 className="h-4 w-4 mr-2" />
                  )}
                  Test API Key
                </Button>

                {testResult && (
                  <div className="flex items-center gap-2">
                    {testResult === 'success' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-success">Valid API key</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">Invalid API key</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                <strong>Required APIs:</strong> Make sure the following APIs are enabled in your Google Cloud Console:
                <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                  <li>Maps JavaScript API</li>
                  <li>Geocoding API</li>
                  <li>Places API (optional, for enhanced location features)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={saveSettings} 
            disabled={saving || !googleMapsApiKey.trim()}
            className="bg-gradient-primary hover:bg-primary-hover"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};