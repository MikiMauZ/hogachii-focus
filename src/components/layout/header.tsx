'use client';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

type HeaderProps = {
  setSidebarOpen: (open: boolean) => void;
  navPosition?: 'left' | 'top';
};

export default function Header({ setSidebarOpen, navPosition }: HeaderProps) {
  
  const showMobileMenuButton = navPosition === 'left';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {showMobileMenuButton && (
        <Button
          size="icon"
          variant="outline"
          className="sm:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      )}
      <div className="relative ml-auto flex-1 md:grow-0"></div>
    </header>
  );
}
