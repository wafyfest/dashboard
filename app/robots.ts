import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wafyfest.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/student-login', '/login', '/privacy'],
        disallow: [
          '/admin',
          '/admin/',
          '/college',
          '/college/',
          '/convenor',
          '/convenor/',
          '/stage-controller',
          '/stage-controller/',
          '/result-entry',
          '/result-entry/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
