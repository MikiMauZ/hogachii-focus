'use client';
import {
  ListTodo,
  ShoppingCart,
  Calendar,
  Clock,
  UtensilsCrossed,
  HeartPulse,
  Wallet,
  MessageCircle,
  LogOut,
  User,
  LayoutDashboard,
  Gift,
  BookOpen,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardSettings } from '../dashboard/dashboard-settings-store';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Family } from '@/lib/types';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tareas', icon: ListTodo },
  { href: '/shopping', label: 'Compras', icon: ShoppingCart },
  { href: '/calendar', label: 'Calendario', icon: Calendar },
  { href: '/schedules', label: 'Horarios', icon: Clock },
  { href: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { href: '/health', label: 'Salud', icon: HeartPulse },
  { href: '/economy', label: 'Economía', icon: Wallet },
  { href: '/wishlist', label: 'Deseos', icon: Gift },
  { href: '/reading', label: 'Lectura', icon: BookOpen },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
];

type MainNavProps = {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  navPosition: 'left' | 'top';
};

const NavLink = ({ item, pathname, onClick, navPosition } : { item: typeof navItems[0], pathname: string, onClick?: () => void, navPosition: 'left' | 'top' }) => {
  const isActive = pathname === item.href;
  return (
     <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              'relative flex items-center justify-center rounded-lg text-muted-foreground transition-all duration-300 ease-in-out hover:scale-110 hover:text-foreground',
              navPosition === 'left' ? 'h-10 w-10' : 'h-14 px-4 gap-2',
              isActive && 'text-primary-foreground'
            )}
            onClick={onClick}
          >
            {isActive && <span className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg"></span>}
            <item.icon className="h-5 w-5" />
            <span className={cn("sr-only", navPosition === 'top' && "sm:not-sr-only sm:font-semibold")}>{item.label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side={navPosition === 'left' ? 'right' : 'bottom'}>{item.label}</TooltipContent>
      </Tooltip>
  )
}

const UserMenu = () => {
    const auth = useAuth();
    const firestore = useFirestore();
    const { data: user, isLoading } = useUser();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [hasPendingRequests, setHasPendingRequests] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!user || !user.familyId || !firestore) {
            setHasPendingRequests(false);
            return;
        }
        
        const familyRef = doc(firestore, 'families', user.familyId);
        const unsubscribe = onSnapshot(familyRef, (docSnap) => {
            if (docSnap.exists()) {
                const familyData = docSnap.data() as Family;
                if (familyData.ownerId === user.uid) {
                    setHasPendingRequests(familyData.pendingMembers && familyData.pendingMembers.length > 0);
                } else {
                    setHasPendingRequests(false);
                }
            }
        });

        return () => unsubscribe();

    }, [user, firestore]);

    const handleSignOut = async () => {
        if (auth) {
          await signOut(auth);
          router.push('/');
        }
    };

    if (!isClient) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                variant="outline"
                size="icon"
                className="relative overflow-hidden rounded-full"
                >
                {hasPendingRequests && (
                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
                )}
                <Avatar>
                    <AvatarImage
                    src={user?.photoURL || ''}
                    alt={user?.displayName || 'Avatar'}
                    />
                    <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{isLoading ? 'Cargando...' : (user?.displayName || 'Mi Cuenta')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                <Link href="/profile" className="relative">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil y Familia</span>
                     {hasPendingRequests && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 block h-2 w-2 rounded-full bg-red-500" />
                    )}
                </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const DashboardSettingsButton = () => {
  const pathname = usePathname();
  const { setSettingsOpen } = useDashboardSettings();

  if (pathname !== '/dashboard') return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-5 w-5" />
          <span className="sr-only">Personalizar Dashboard</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Personalizar Dashboard</TooltipContent>
    </Tooltip>
  )

}

export default function MainNav({
  isSidebarOpen,
  setSidebarOpen,
  navPosition,
}: MainNavProps) {
  const pathname = usePathname();

  const navLinks = (
    <TooltipProvider>
      {navItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setSidebarOpen(false)} navPosition={navPosition} />
      ))}
    </TooltipProvider>
  );

  const desktopNavLeft = (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-20 flex-col border-r bg-background/50 backdrop-blur-sm sm:flex">
      <nav className="flex flex-col items-center gap-2 px-2 sm:py-5">
        <TooltipProvider>
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} navPosition="left" />
          ))}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <DashboardSettingsButton />
        </TooltipProvider>
        <UserMenu />
      </nav>
    </aside>
  );

  const desktopNavTop = (
     <header className="sticky top-0 z-30 hidden sm:flex h-20 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
        <nav className="flex items-center gap-2">
           <TooltipProvider>
             {navItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} navPosition="top" />
              ))}
           </TooltipProvider>
        </nav>
        <div className="flex items-center gap-4">
            <DashboardSettingsButton />
            <UserMenu />
        </div>
     </header>
  );

  const mobileNav = (
    <div className="sm:hidden">
      <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="flex flex-col p-0 w-20 bg-background/80 backdrop-blur-sm">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="sr-only">Menú Principal</SheetTitle>
            <SheetDescription className="sr-only">
              Navegación principal de la aplicación Hogachii.
            </SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col items-center gap-2 px-2 py-5">
            {navLinks}
          </nav>
          <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-5 border-t">
            <DashboardSettingsButton />
            <UserMenu />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );

  if (navPosition === 'top') {
      return (
          <>
            {desktopNavTop}
            {mobileNav}
          </>
      )
  }

  return (
    <>
      {desktopNavLeft}
      {mobileNav}
    </>
  );
}
