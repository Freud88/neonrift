import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeonRift: Chronicles of the Grid',
  description: 'A cyberpunk card battle RPG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
