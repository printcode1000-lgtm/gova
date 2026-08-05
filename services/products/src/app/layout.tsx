/**
 * Next.js requires a root layout. This service has no pages — it exists only to
 * serve API routes — so the layout stays as small as the framework allows.
 */
export const metadata = {
  title: 'ASOL Products Service',
  description: 'Product read APIs only. No user interface.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
