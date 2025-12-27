'use client';

import { use } from 'react';
import { blogPosts } from '@/lib/blog-data';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { data: user } = useUser();
  const post = blogPosts.find((p) => p.slug === resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            {user ? (
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al blog
              </Button>
            )}
          </div>

          <article>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 mb-8 text-muted-foreground">
              <span>{post.author}</span>
              <span>&bull;</span>
              <span>{post.date}</span>
            </div>

            <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-lg mb-12">
              <Image
                src={post.imageUrl}
                alt={post.title}
                layout="fill"
                objectFit="cover"
              />
            </div>

            <div
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>
        </div>
      </div>
    </div>
  );
}
