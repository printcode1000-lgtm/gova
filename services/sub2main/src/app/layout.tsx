export const metadata = {
  title: 'ASOL Sub2main Service',
  description: 'Seller profile, product writes, and storage upload APIs only.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
