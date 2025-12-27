'use client';
import { Menu, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/stores/dashboard-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';

type HeaderProps = {
  setSidebarOpen: (open: boolean) => void;
  navPosition?: 'left' | 'top';
};

const MemberSelector = () => {
    const { familyMembers, selectedMemberId, setSelectedMemberId } = useDashboardStore();

    if (familyMembers.length === 0) return null;

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
             <Button
                variant={!selectedMemberId ? 'default' : 'outline'}
                onClick={() => setSelectedMemberId(null)}
                className={cn(
                    "flex items-center gap-2 transition-all hover:scale-105",
                    !selectedMemberId && 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                )}
            >
                <Users className="h-5 w-5"/>
                <span className="font-semibold">Vista Completa</span>
            </Button>
            {familyMembers.map(member => (
                 <Button
                    key={member.uid}
                    variant={selectedMemberId === member.uid ? 'default' : 'outline'}
                    onClick={() => setSelectedMemberId(member.uid)}
                     className={cn(
                        "flex items-center gap-2 transition-all hover:scale-105",
                        selectedMemberId === member.uid && 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    )}
                >
                    <Avatar className="h-6 w-6 text-sm">
                        <AvatarFallback className="bg-transparent">{member.avatar || '👤'}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{member.givenName}</span>
                </Button>
            ))}
        </div>
    )
}

export default function Header({ setSidebarOpen, navPosition }: HeaderProps) {
  
  const showMobileMenuButton = navPosition === 'left';

  return (
    <header className="sticky top-0 z-30 flex h-auto flex-col items-start gap-4 border-b bg-transparent px-4 py-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex w-full items-center">
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
      </div>
      <div className="w-full">
         <MemberSelector />
      </div>
    </header>
  );
}
