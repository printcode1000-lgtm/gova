export const metadata = {
  title: 'ASOL Submain Service',
  description: 'Search, cart checkout, and order-creation APIs only.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
