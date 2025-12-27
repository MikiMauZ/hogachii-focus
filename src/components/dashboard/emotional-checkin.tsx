'use client';

import { Smile, Meh, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const moods = [
  { name: 'Bien', icon: Smile, variant: 'success' as const },
  { name: 'Normal', icon: Meh, variant: 'secondary' as const },
  { name: 'Mal', icon: Frown, variant: 'destructive' as const },
];

export default function EmotionalCheckin() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 rounded-full border bg-card p-1 shadow-sm">
        {moods.map((mood) => (
          <Tooltip key={mood.name}>
            <TooltipTrigger asChild>
              <Button
                variant={selectedMood === mood.name ? mood.variant : 'ghost'}
                size="icon"
                className={cn(
                  'rounded-full h-10 w-10 transition-all duration-200',
                  selectedMood === mood.name
                    ? 'scale-110'
                    : 'text-muted-foreground'
                )}
                onClick={() => setSelectedMood(mood.name)}
              >
                <mood.icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>¿Cómo te sientes? {mood.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
