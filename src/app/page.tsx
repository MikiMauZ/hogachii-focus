
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, BarChart, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Organización Familiar Centralizada',
    description: 'Coordina horarios, tareas y eventos de todos en un solo lugar.',
  },
  {
    icon: BarChart,
    title: 'Finanzas Bajo Control',
    description: 'Gestiona presupuestos, sigue gastos y alcanza metas de ahorro en equipo.',
  },
  {
    icon: ShieldCheck,
    title: 'Salud Familiar, Simplificada',
    description: 'Mantén un registro de citas médicas, medicamentos y vacunas sin estrés.',
  },
  {
    icon: Heart,
    title: 'Foco y Bienestar',
    description: 'Herramientas diseñadas para reducir la carga mental y mejorar el bienestar.',
  },
];

export default function LandingPage() {
  const { data: user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="font-bold text-lg">
            Hogachii Focus
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Empezar Gratis <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container grid lg:grid-cols-2 gap-12 items-center py-24 md:py-32">
          <div className="flex flex-col gap-6 text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">
              Recupera la calma en tu hogar.
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl mx-auto lg:mx-0">
              Hogachii Focus es el sistema operativo para tu familia. Simplifica la gestión diaria para que puedas enfocarte en lo que de verdad importa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
               <Button size="lg" asChild className="text-lg">
                  <Link href="/login">Empieza a organizarte ahora</Link>
                </Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-full max-w-2xl p-6 bg-white/10 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/20">
                <img src="https://picsum.photos/seed/dashboard/1200/800" alt="Dashboard de Hogachii" className="rounded-xl shadow-lg" />
            </div>
          </div>
        </section>

        <section className="container py-24 md:py-32 bg-background/80 rounded-t-3xl">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-16">
                <h2 className="font-bold text-3xl md:text-5xl">Todo lo que tu familia necesita para prosperar</h2>
                <p className="max-w-[85%] text-muted-foreground md:text-lg">
                    Desde la agenda hasta las finanzas, todo conectado en un espacio tranquilo y sin distracciones.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                    <Card key={index} className="bg-card/80 border-0 shadow-none hover:transform-none">
                        <CardHeader>
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>{feature.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
      </main>

      <footer className="container py-8">
         <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Hogachii Focus. Todos los derechos reservados.
          </p>
      </footer>
    </div>
  );
}
