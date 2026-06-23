import React, { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
 import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, Clock, Share2, Twitter, Facebook, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { BlogContent, RelatedPosts } from '@/components/blog';
import { getBlogPostBySlug, getRelatedPosts } from '@/data/blogPosts';

export default function BlogPost() {
   const { t } = useTranslation('blog');
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;
  const relatedPosts = slug ? getRelatedPosts(slug, 3) : [];

  useEffect(() => {
    if (post) {
      // Update title
      // Keep <title> short for SERPs; brand suffix only if room remains
      document.title = post.title.length <= 50 ? `${post.title} | DairyFlow` : post.title;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', post.excerpt);
      }

      // Set canonical URL
      const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (link) link.setAttribute('href', `https://dairyflow.mywebz.in/blog/${post.slug}`);

      // Update OG tags for social sharing
      const setMeta = (property: string, content: string) => {
        let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (el) el.setAttribute('content', content);
      };
      setMeta('og:title', `${post.title} | DairyFlow Blog`);
      setMeta('og:description', post.excerpt);
      setMeta('og:url', `https://dairyflow.mywebz.in/blog/${post.slug}`);
      setMeta('og:type', 'article');
      const baseUrl = 'https://dairyflow.mywebz.in';
      setMeta('og:image', `${baseUrl}${post.featuredImage}`);
      setMeta('og:image:alt', post.title);
      setMeta('twitter:image', `${baseUrl}${post.featuredImage}`);
      const localeMap: Record<string, string> = { hi: 'hi_IN', mr: 'mr_IN', en: 'en_IN' };
      setMeta('og:locale', localeMap[post.lang || 'en'] || 'en_IN');

      // Set html lang attribute
      const postLang = post.lang || 'en';
      document.documentElement.setAttribute('lang', postLang);

      // Article structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'article-jsonld';
      script.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        image: post.featuredImage,
        inLanguage: post.lang || 'en',
        author: {
          '@type': 'Person',
          name: post.author.name,
        },
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        publisher: {
          '@type': 'Organization',
          name: 'DairyFlow',
          url: 'https://dairyflow.mywebz.in',
        },
        keywords: post.keywords.join(', '),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://dairyflow.mywebz.in/blog/${post.slug}`,
        },
      });
      document.head.appendChild(script);

      // BreadcrumbList structured data
      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.id = 'breadcrumb-jsonld';
      breadcrumbScript.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://dairyflow.mywebz.in/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: 'https://dairyflow.mywebz.in/blog',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: `https://dairyflow.mywebz.in/blog/${post.slug}`,
          },
        ],
      });
      document.head.appendChild(breadcrumbScript);

      return () => {
        const articleEl = document.getElementById('article-jsonld');
        const breadcrumbEl = document.getElementById('breadcrumb-jsonld');
        if (articleEl) document.head.removeChild(articleEl);
        if (breadcrumbEl) document.head.removeChild(breadcrumbEl);
        // Restore defaults
        document.title = "DairyFlow - India's #1 Dairy Delivery Management App";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', 'Manage milk subscriptions, optimize delivery routes & track orders in real-time. Trusted by 500+ dairies across India. Start your free 14-day trial.');
        }
        if (link) link.setAttribute('href', 'https://dairyflow.mywebz.in/');
        setMeta('og:type', 'website');
        setMeta('og:image', 'https://dairyflow.mywebz.in/og-image.png');
        setMeta('og:image:alt', "DairyFlow - India's #1 Dairy Delivery Management App");
        setMeta('twitter:image', 'https://dairyflow.mywebz.in/og-image.png');
        setMeta('og:locale', 'en_IN');
        document.documentElement.setAttribute('lang', 'en');
      };
    }
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = encodeURIComponent(post.title);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
           <ArrowLeft className="w-4 h-4" />
             <span className="text-sm font-medium">{t('backToBlog')}</span>
          </Link>
          
          <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
             <Link to="/auth">{t('getStarted')}</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
               <Link to="/">{t('home')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
               <Link to="/blog">{t('blog')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[200px]">
                {post.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Featured Image */}
        <div className="aspect-video rounded-xl overflow-hidden bg-muted mb-8">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
               <span>{t('minRead', { time: post.readTime })}</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
              <AvatarFallback>{post.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{post.author.name}</p>
              <p className="text-sm text-muted-foreground">{post.author.bio}</p>
            </div>
          </div>
        </header>

        <Separator className="my-8" />

        {/* Article Content */}
        <article className="mb-12">
          <BlogContent content={post.content} />
        </article>

        <Separator className="my-8" />

        {/* Share Section */}
        <div className="flex flex-wrap items-center gap-4 mb-12">
           <span className="text-sm font-medium text-foreground">{t('shareArticle')}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="h-9 w-9"
              aria-label="Share article"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              className="h-9 w-9"
              aria-label="Share on Twitter"
            >
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              className="h-9 w-9"
              aria-label="Share on Facebook"
            >
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              className="h-9 w-9"
              aria-label="Share on LinkedIn"
            >
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Related Posts */}
        <RelatedPosts posts={relatedPosts} />
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
           <p>© {new Date().getFullYear()} DairyFlow. {t('copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
