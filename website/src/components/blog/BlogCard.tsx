import React from 'react';
import { Link } from 'react-router-dom';
 import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Calendar, Clock, User } from 'lucide-react';
import type { BlogPost } from '@/data/blogPosts';

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
   const { t } = useTranslation('blog');
  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link to={`/blog/${post.slug}`}>
      <Card interactive className="overflow-hidden h-full">
        <AspectRatio ratio={16 / 9}>
          <img
            src={post.featuredImage}
            alt={`Featured image for ${post.title}`}
            loading="lazy"
            decoding="async"
            className="object-cover w-full h-full bg-muted"
          />
        </AspectRatio>
        <CardContent className="p-5 space-y-3">
          <Badge variant="secondary" className="text-xs">
            {post.category}
          </Badge>
          
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.excerpt}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{post.author.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
               <span>{t('minRead', { time: post.readTime })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
