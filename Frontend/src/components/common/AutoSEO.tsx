import { useLocation } from 'react-router-dom';
import { getSEOForPath } from '@/lib/seo-config';
import SEOHead from './SEOHead';

export default function AutoSEO() {
  const { pathname } = useLocation();
  const config = getSEOForPath(pathname);

  return (
    <SEOHead
      title={config.title}
      description={config.description}
      ogTitle={config.ogTitle}
      ogDescription={config.ogDescription}
      ogImage={config.ogImage}
      ogType={config.ogType}
      noIndex={config.noIndex}
      canonicalPath={config.noIndex ? undefined : pathname}
    />
  );
}
