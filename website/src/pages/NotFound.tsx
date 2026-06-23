import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
 import { useTranslation } from "react-i18next";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
   const { t } = useTranslation('common');

  useEffect(() => {
    document.title = 'Page Not Found | DairyFlow';
    // Tell search engines not to index 404 pages
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (robotsMeta) {
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    }
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    return () => {
      if (robotsMeta) {
        robotsMeta.setAttribute('content', 'index, follow');
      }
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
         <h1 className="text-8xl font-bold text-primary">404</h1>
         <h2 className="text-2xl font-semibold text-foreground">{t('pageNotFound.title')}</h2>
         <p className="text-muted-foreground max-w-md mx-auto">
           {t('pageNotFound.description')}
         </p>
        <Button asChild className="mt-4">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
             {t('pageNotFound.returnHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
