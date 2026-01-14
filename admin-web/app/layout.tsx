import type { Metadata } from 'next';
import { PanelProvider } from '@/lib/panelContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampusIQ Admin Console',
  description: 'Super Admin web interface for CampusIQ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PanelProvider>
          {children}
        </PanelProvider>
      </body>
    </html>
  );
}
