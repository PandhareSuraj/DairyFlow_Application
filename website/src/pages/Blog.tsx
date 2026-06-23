import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
 import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlogCard, BlogHeader } from '@/components/blog';
import { blogPosts, categories, getPostsByCategory, searchPosts, getPostsByLang } from '@/data/blogPosts';
import type { CategoryType } from '@/data/blogPosts';

const POSTS_PER_PAGE = 9;

export default function Blog() {
   const { t, i18n } = useTranslation('blog');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    const lang = i18n.language?.substring(0, 2);
    return ['hi', 'mr'].includes(lang) ? lang : 'all';
  });

  // Update document title, canonical, OG, and meta for SEO
  useEffect(() => {
    const newTitle = 'DairyFlow Blog: Dairy Delivery Tips & Insights';
    const newDesc = 'Expert tips on dairy delivery, milk subscriptions, route optimization, and customer retention from DairyFlow.';
    const blogUrl = 'https://dairyflow.mywebz.in/blog';

    document.title = newTitle;

    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (link) link.setAttribute('href', blogUrl);

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', newDesc);

    const setMeta = (property: string, content: string) => {
      const el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (el) el.setAttribute('content', content);
    };
    setMeta('og:title', newTitle);
    setMeta('og:description', newDesc);
    setMeta('og:url', blogUrl);

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'blog-listing-jsonld';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'DairyFlow Blog - Dairy Delivery Industry Insights',
      description: newDesc,
      url: blogUrl,
      publisher: {
        '@type': 'Organization',
        name: 'DairyFlow',
        url: 'https://dairyflow.mywebz.in',
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: blogPosts.slice(0, 10).map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://dairyflow.mywebz.in/blog/${post.slug}`,
          name: post.title,
        })),
      },
    });
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('blog-listing-jsonld');
      if (el) document.head.removeChild(el);
      document.title = "DairyFlow - India's #1 Dairy Delivery Management App";
      const homeDesc = 'Manage milk subscriptions, optimize delivery routes & track orders in real-time. Trusted by 500+ dairies across India. Start your free 14-day trial.';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', homeDesc);
      const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (canonicalLink) canonicalLink.setAttribute('href', 'https://dairyflow.mywebz.in/');
      setMeta('og:title', "DairyFlow - Dairy Delivery Software | Route Optimization & Subscriptions");
      setMeta('og:description', homeDesc);
      setMeta('og:url', 'https://dairyflow.mywebz.in/');
    };
  }, []);

  const filteredPosts = useMemo(() => {
    let posts = searchQuery 
      ? searchPosts(searchQuery)
      : getPostsByCategory(selectedCategory);
    // Filter by language
    if (selectedLang !== 'all') {
      posts = posts.filter(p => (p.lang || 'en') === selectedLang);
    }
    return posts;
  }, [selectedCategory, searchQuery, selectedLang]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as CategoryType);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
           <ArrowLeft className="w-4 h-4" />
             <span className="text-sm font-medium">{t('backToHome')}</span>
          </Link>
          
          <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
             <Link to="/auth">{t('getStarted')}</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <BlogHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Language Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'हिंदी' },
            { value: 'mr', label: 'मराठी' },
          ].map((lang) => (
            <Button
              key={lang.value}
              variant={selectedLang === lang.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedLang(lang.value); setCurrentPage(1); }}
            >
              {lang.label}
            </Button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
             placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={handleCategoryChange} className="w-full md:w-auto">
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
              {categories.map((category) => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5 text-sm"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-6">
           {filteredPosts.length === 1 
             ? t('articlesFound', { count: filteredPosts.length })
             : t('articlesFoundPlural', { count: filteredPosts.length })}
           {searchQuery && ` ${t('forQuery', { query: searchQuery })}`}
           {selectedCategory !== 'All' && !searchQuery && ` ${t('inCategory', { category: selectedCategory })}`}
        </p>

        {/* Blog Grid */}
        {paginatedPosts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
             <p className="text-muted-foreground">{t('noArticles')}</p>
            <Button 
              variant="link" 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-2"
            >
               {t('clearFilters')}
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
               {t('previous')}
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-9"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
               {t('next')}
            </Button>
          </div>
        )}
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
