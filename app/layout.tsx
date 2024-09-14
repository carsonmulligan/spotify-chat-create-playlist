import React from 'react';
import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AI Spotify Playlist Creator</title>
        <link rel="stylesheet" href="/style.css" />
        <Script src="https://js.stripe.com/v3/" />
        <Script id="stripe-js" strategy="afterInteractive">
          {`window.STRIPE_PUBLISHABLE_KEY = '${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}';`}
        </Script>
      </head>
      <body>
        {children}
        <Script src="/index.js" />
      </body>
    </html>
  )
}