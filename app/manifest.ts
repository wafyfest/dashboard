import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '14th Wafy Arts Fest Portal',
    short_name: 'Wafy Fest',
    description: 'Official Arts Fest Management Portal by Wafy Students Federation & CIC',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#059669',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
