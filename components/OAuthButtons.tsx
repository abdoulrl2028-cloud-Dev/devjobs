"use client";

import { useEffect, useState } from "react";

type ProviderConfig = { google: boolean; facebook: boolean };

export default function OAuthButtons() {
  const [config, setConfig] = useState<ProviderConfig | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/oauth/config", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null)
      .then((data) => {
        if (!active) return;
        setConfig(data?.data ?? { google: false, facebook: false });
      });
    return () => {
      active = false;
    };
  }, []);

  if (!config || (!config.google && !config.facebook)) return null;

  return (
    <div className="oauth-buttons">
      <div className="oauth-divider">
        <span>ou continue com</span>
      </div>
      {config.google && (
        <a href="/api/auth/oauth/google" className="btn oauth-btn oauth-btn--google">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Entrar com Google
        </a>
      )}
      {config.facebook && (
        <a href="/api/auth/oauth/facebook" className="btn oauth-btn oauth-btn--facebook">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#1877F2"
              d="M24 1C11.3 1 1 11.3 1 24c0 11.5 8.4 21 19.4 22.7V30.6h-5.8V24h5.8v-5c0-5.7 3.4-8.9 8.6-8.9 2.5 0 5.1.4 5.1.4v5.6h-2.9c-2.8 0-3.7 1.8-3.7 3.6V24h6.3l-1 6.6h-5.3v16.1C38.6 45 47 35.5 47 24 47 11.3 36.7 1 24 1z"
            />
            <path
              fill="#fff"
              d="M33.3 30.6l1-6.6h-6.3v-4.3c0-1.8.9-3.6 3.7-3.6h2.9V10.5s-2.6-.4-5.1-.4c-5.2 0-8.6 3.2-8.6 8.9V24h-5.8v6.6h5.8v16.1c1.2.2 2.4.3 3.7.3s2.5-.1 3.7-.3V30.6h5.3z"
            />
          </svg>
          Continuar com Facebook
        </a>
      )}
    </div>
  );
}