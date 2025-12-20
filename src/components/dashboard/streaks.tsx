import { Flame, Star } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const avatars = PlaceHolderImages.filter((img) =>
  img.id.startsWith('avatar')
);

export default function Streaks() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="text-orange-500" />
          <span>Racha Familiar</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <Flame className="h-24 w-24 text-orange-400" fill="currentColor" />
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">
            42
          </span>
        </div>
        <p className="text-muted-foreground">¡Días consecutivos completando tareas!</p>
        <div className="flex -space-x-4">
          {avatars.map((avatar) => (
            <Avatar key={avatar.id} className="border-2 border-card">
              <AvatarImage
                src={avatar.imageUrl}
                alt={avatar.description}
                data-ai-hint={avatar.imageHint}
              />
              <AvatarFallback>{avatar.id.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">
          <Star className="mr-2" />
          Desafío Semanal
        </Button>
      </CardFooter>
    </Card>
  );
}
