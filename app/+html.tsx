import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML shell for the static web export (`expo export --platform web`).
 *
 * Exists for the PWA plumbing web push depends on: the manifest link is what
 * lets iOS Safari (16.4+) install the app to the home screen, which is the only
 * mode where iOS delivers web push at all. Android Chrome pushes fine in a
 * plain tab but uses the manifest for its install prompt.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B0F19" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Prime" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
