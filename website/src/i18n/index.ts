import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Only eagerly load English (fallback language) to reduce initial bundle
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enDashboard from '@/locales/en/dashboard.json';
import enCustomer from '@/locales/en/customer.json';
import enDelivery from '@/locales/en/delivery.json';
import enDairy from '@/locales/en/dairy.json';
import enAdmin from '@/locales/en/admin.json';
import enNotifications from '@/locales/en/notifications.json';
import enTour from '@/locales/en/tour.json';
import enBlog from '@/locales/en/blog.json';

const namespaces = ['common', 'auth', 'dashboard', 'customer', 'delivery', 'dairy', 'admin', 'notifications', 'tour', 'blog'] as const;

// Lazy loaders for non-English languages
const lazyLoaders: Record<string, () => Promise<Record<string, unknown>>> = {
  'hi/common': () => import('@/locales/hi/common.json').then(m => m.default),
  'hi/auth': () => import('@/locales/hi/auth.json').then(m => m.default),
  'hi/dashboard': () => import('@/locales/hi/dashboard.json').then(m => m.default),
  'hi/customer': () => import('@/locales/hi/customer.json').then(m => m.default),
  'hi/delivery': () => import('@/locales/hi/delivery.json').then(m => m.default),
  'hi/dairy': () => import('@/locales/hi/dairy.json').then(m => m.default),
  'hi/admin': () => import('@/locales/hi/admin.json').then(m => m.default),
  'hi/notifications': () => import('@/locales/hi/notifications.json').then(m => m.default),
  'hi/tour': () => import('@/locales/hi/tour.json').then(m => m.default),
  'hi/blog': () => import('@/locales/hi/blog.json').then(m => m.default),
  'mr/common': () => import('@/locales/mr/common.json').then(m => m.default),
  'mr/auth': () => import('@/locales/mr/auth.json').then(m => m.default),
  'mr/dashboard': () => import('@/locales/mr/dashboard.json').then(m => m.default),
  'mr/customer': () => import('@/locales/mr/customer.json').then(m => m.default),
  'mr/delivery': () => import('@/locales/mr/delivery.json').then(m => m.default),
  'mr/dairy': () => import('@/locales/mr/dairy.json').then(m => m.default),
  'mr/admin': () => import('@/locales/mr/admin.json').then(m => m.default),
  'mr/notifications': () => import('@/locales/mr/notifications.json').then(m => m.default),
  'mr/tour': () => import('@/locales/mr/tour.json').then(m => m.default),
  'mr/blog': () => import('@/locales/mr/blog.json').then(m => m.default),
};

export async function loadLanguage(lng: string) {
  if (lng === 'en' || i18n.hasResourceBundle(lng, 'common')) return;
  
  const loads = namespaces.map(async (ns) => {
    const key = `${lng}/${ns}`;
    const loader = lazyLoaders[key];
    if (loader) {
      const data = await loader();
      i18n.addResourceBundle(lng, ns, data, true, true);
    }
  });
  await Promise.all(loads);
}

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    customer: enCustomer,
    delivery: enDelivery,
    dairy: enDairy,
    admin: enAdmin,
    notifications: enNotifications,
    tour: enTour,
    blog: enBlog,
  },
};

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...namespaces],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Load the detected language if it's not English
const detectedLng = i18n.language?.split('-')[0];
if (detectedLng && detectedLng !== 'en') {
  loadLanguage(detectedLng);
}

// Language loading is handled by LanguageContext to avoid race conditions

export default i18n;
