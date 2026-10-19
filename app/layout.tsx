import type { Metadata } from "next";
import "./globals.css";

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export const metadata: Metadata = {
  title: "Trilha — seu espaço de estudos",
  description: "Estude no seu ritmo com questões de Português, Matemática, Raciocínio Lógico e legislação de Contagem.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
