import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider, FavoritesProvider } from "@/lib/app-context";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DevJobs — Vagas de tecnologia",
    template: "%s | DevJobs",
  },
  description:
    "Encontre as melhores vagas de tecnologia: frontend, backend, mobile, dados, DevOps e muito mais. Plataforma pública de empregos para devs.",
  applicationName: "DevJobs",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DevJobs",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
};

const viewport: Viewport = {
  themeColor: "#6d28d9",
  width: "device-width",
  initialScale: 1,
};

export { viewport };

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("devjobs-theme");
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script defer src="/sw-register.js" />
      </head>
      <body>
        <AuthProvider>
          <FavoritesProvider>
            <Header />
            <main className="main">{children}</main>
            <footer className="footer">
              <p>
                <strong>DevJobs</strong> — vagas de tecnologia para pessoas desenvolvedoras.
              </p>
              <p>Next.js · TypeScript · API REST · © {new Date().getFullYear()}</p>
            </footer>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}