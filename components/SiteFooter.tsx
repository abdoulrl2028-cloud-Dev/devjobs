"use client";

import { usePathname } from "next/navigation";

// Footer do site público — oculto dentro do app Premium (/app).
export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/app" || pathname.startsWith("/app/")) return null;

  return (
    <footer className="footer">
      <p>
        <strong>DevJobs</strong> — vagas de tecnologia para pessoas desenvolvedoras.
      </p>
      <p>
        Next.js · TypeScript · API REST · © {new Date().getFullYear()} ·{" "}
        <a href="/privacidade">Política de Privacidade</a>
      </p>
    </footer>
  );
}