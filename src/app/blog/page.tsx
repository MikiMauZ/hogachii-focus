'use client';

import { blogPosts } from '@/lib/blog-data';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function BlogListPage() {
  const router = useRouter();
  const { data: user } = useUser();

  return (
    <div className="bg-background min-h-screen">
      <header className="py-16 text-center container">
        <div className="flex items-center justify-between mb-8">
            {user ? (
                 <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Volver al Dashboard
                </Button>
            ) : (
                <Button variant="ghost" onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Inicio
                </Button>
            )}
        </div>
        <div className="container">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Blog de Hogachii
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Consejos, ideas y reflexiones para una vida familiar más simple y feliz.
          </p>
        </div>
      </header>

      <main className="container pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Card key={post.id} className="flex flex-col overflow-hidden">
              <div className="relative w-full h-56">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{post.title}</CardTitle>
                <CardDescription>{post.date} &bull; {post.author}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">{post.excerpt}</p>
              </CardContent>
              <CardFooter>
                <Link href={`/blog/${post.slug}`} className="font-semibold text-primary hover:underline flex items-center">
                  Leer más <LayoutDashboard className="ml-2 h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
