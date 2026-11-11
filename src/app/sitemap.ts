import type { MetadataRoute } from 'next';
import { READY_TOOLS } from '@/lib/tools/registry';
import { SITE } from '@/lib/site-config';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{return [{url:`${SITE.url}/`,changeFrequency:'monthly',priority:1},{url:`${SITE.url}/tools/`,changeFrequency:'monthly',priority:.9},{url:`${SITE.url}/about/`,changeFrequency:'yearly',priority:.3},{url:`${SITE.url}/privacy/`,changeFrequency:'yearly',priority:.2},{url:`${SITE.url}/terms/`,changeFrequency:'yearly',priority:.2},...READY_TOOLS.map(t=>({url:`${SITE.url}/${t.slug}/`,changeFrequency:'monthly' as const,priority:t.popular ? 0.8 : 0.6}))];}
