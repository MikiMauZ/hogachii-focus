'use client';
import { useState } from 'react';
import Header from '@/components/layout/header';
import MainNav from '@/components/layout/main-nav';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { data: user } = useUser();
  const navPosition = user?.settings?.navPosition || 'left';

  return (
    <div className={cn("min-h-screen w-full", navPosition === 'left' ? 'flex' : 'flex flex-col')}>
      <MainNav isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} navPosition={navPosition} />
      <div className={cn("flex flex-col flex-1", navPosition === 'left' ? 'sm:pl-20' : '')}>
        <Header setSidebarOpen={setSidebarOpen} navPosition={navPosition} />
        <main className="grid flex-1 items-start gap-8 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
