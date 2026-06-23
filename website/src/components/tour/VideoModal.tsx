import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoModal({ open, onOpenChange }: VideoModalProps) {
  const { t } = useTranslation('tour');
  
  // Convert YouTube URL to embed format
  // https://youtu.be/nK1Ranj77h0 -> https://www.youtube.com/embed/nK1Ranj77h0
  const videoId = 'nK1Ranj77h0';
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('hero.watchDemo')}</DialogTitle>
        </DialogHeader>
        <AspectRatio ratio={16 / 9}>
          {open && (
            <iframe
              src={embedUrl}
              title={t('hero.watchDemo')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          )}
        </AspectRatio>
      </DialogContent>
    </Dialog>
  );
}
