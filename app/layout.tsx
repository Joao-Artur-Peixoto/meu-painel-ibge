'use client';
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body>
        {/* O SessionProvider permite que qualquer página 
            saiba se o usuário está logado ou não */}
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}