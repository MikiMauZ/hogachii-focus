'use client';
import {
  Home,
  ListTodo,
  ShoppingCart,
  Calendar,
  Clock,
  UtensilsCrossed,
  HeartPulse,
  Wallet,
  MessageCircle,
  Settings,
  Package2,
  LogOut,
  User,
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
import { useAuth, useUser } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/tasks', label: 'Tareas', icon: ListTodo },
  { href: '/shopping', label: 'Compras', icon: ShoppingCart },
  { href: '/calendar', label: 'Calendario', icon: Calendar },
  { href: '/schedules', label: 'Horarios', icon: Clock },
  { href: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { href: '/health', label: 'Salud', icon: HeartPulse },
  { href: '/economy', label: 'Economía', icon: Wallet },
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
              navPosition === 'left' ? 'h-12 w-12' : 'h-14 px-4 gap-2',
              isActive && 'text-primary-foreground'
            )}
            onClick={onClick}
          >
            {isActive && <span className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg"></span>}
            <item.icon className="h-6 w-6" />
            <span className={cn("sr-only", navPosition === 'top' && "sm:not-sr-only sm:font-semibold")}>{item.label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side={navPosition === 'left' ? 'right' : 'bottom'}>{item.label}</TooltipContent>
      </Tooltip>
  )
}

const UserMenu = () => {
    const auth = useAuth();
    const { data: user, isLoading } = useUser();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleSignOut = async () => {
        if (auth) {
        await signOut(auth);
        router.push('/login');
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
                className="overflow-hidden rounded-full"
                >
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
                <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil y Ajustes</span>
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
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="#"
          className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-10 md:w-10 md:text-base"
        >
          <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
          <span className="sr-only">Hogachii</span>
        </Link>
        <TooltipProvider>
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} navPosition="left" />
          ))}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <UserMenu />
      </nav>
    </aside>
  );

  const desktopNavTop = (
     <header className="sticky top-0 z-30 hidden sm:flex h-20 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
        <div className="flex items-center gap-4">
            <Link
            href="/"
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-10 md:w-10 md:text-base"
            >
            <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">Hogachii</span>
            </Link>
        </div>
        <nav className="flex items-center gap-2">
           <TooltipProvider>
             {navItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} navPosition="top" />
              ))}
           </TooltipProvider>
        </nav>
        <div className="flex items-center gap-4">
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
            <Link
              href="#"
              className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
              onClick={() => setSidebarOpen(false)}
            >
              <Package2 className="h-4 w-4 transition-all group-hover:scale-110" />
              <span className="sr-only">Hogachii</span>
            </Link>
          </SheetHeader>
          <nav className="flex flex-col items-center gap-4 px-2 py-5">
            {navLinks}
          </nav>
          <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-5 border-t">
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
