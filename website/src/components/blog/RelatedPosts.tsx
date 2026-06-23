import React from 'react';
 import { useTranslation } from 'react-i18next';
import { BlogCard } from './BlogCard';
import type { BlogPost } from '@/data/blogPosts';

interface RelatedPostsProps {
  posts: BlogPost[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
   const { t } = useTranslation('blog');
   
  if (posts.length === 0) return null;

  return (
    <section className="py-12 border-t border-border">
       <h2 className="text-2xl font-bold text-foreground mb-8">{t('relatedArticles')}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map(post => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
