import { NextRequest, NextResponse } from "next/server";
import {
  getProvider,
  isProviderConfigured,
  signOAuthState,
  verifyOAuthState,
  buildAuthorizeUrl,
  exchangeCode,
  fetchIdentity,
} from "@/lib/oauth";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import {
  getUserByOAuth,
  getUserByEmail,
  createOAuthUser,
  linkOAuthId,
  updateUserAvatar,
} from "@/lib/db/users";
import type { SessionUser } from "@/lib/crypto";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

const OAUTH_STATE_COOKIE = "devjobs_oauth_state";

type OAuthUserLike = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string | null;
};

function stateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
}

function roleRedirect(role: string): string {
  if (role === "company") return "/dashboard";
  if (role === "admin") return "/admin";
  return "/";
}

function toSessionUser(stored: OAuthUserLike): SessionUser {
  return { id: stored.id, name: stored.name, email: stored.email, role: stored.role };
}

function redirectTo(origin: string, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, origin), 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (provider !== "google" && provider !== "facebook") {
    return NextResponse.json({ error: "Provedor não suportado" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/oauth/${provider}`;
  const url = new URL(request.url);

  // Fluxo de início: monta a URL do provedor e guarda o state assinado (anti-CSRF).
  if (!url.searchParams.get("code")) {
    if (!isProviderConfigured(provider)) {
      return NextResponse.json({ error: "Provedor não configurado" }, { status: 501 });
    }
    const state = signOAuthState(globalThis.crypto.randomUUID());
    const authUrl = buildAuthorizeUrl(provider, state, redirectUri);
    const response = NextResponse.redirect(authUrl, 302);
    response.cookies.set(OAUTH_STATE_COOKIE, state, stateCookieOptions());
    return response;
  }

  // Fluxo de callback.
  if (url.searchParams.get("error")) {
    return redirectTo(origin, "/login?erro=oauth-cancelado");
  }

  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const stateParam = url.searchParams.get("state");
  const base = redirectTo(origin, "/login?erro=oauth-estado");
  base.cookies.delete(OAUTH_STATE_COOKIE);
  if (!storedState || !stateParam || !verifyOAuthState(storedState)) {
    return base;
  }

  try {
    const accessToken = await exchangeCode(provider, url.searchParams.get("code") as string, redirectUri);
    const identity = await fetchIdentity(provider, accessToken);

    // Só aceita e-mails confirmados pelo provedor.
    if (!identity.emailVerified) {
      return redirectTo(origin, "/login?erro=oauth-email");
    }

    await ensureDatabaseReady();
    let stored: OAuthUserLike | undefined = await getUserByOAuth(provider, identity.id);
    if (!stored) {
      stored = await getUserByEmail(identity.email);
      if (stored) {
        await linkOAuthId(stored.id, provider, identity.id);
      } else {
        stored = await createOAuthUser({
          provider,
          providerId: identity.id,
          email: identity.email,
          name: identity.name,
          avatarUrl: identity.picture,
        });
      }
    }
    if (identity.picture && !stored.avatar_url) {
      await updateUserAvatar(stored.id, identity.picture).catch(() => undefined);
    }

    const token = createSessionToken(toSessionUser(stored));
    const response = redirectTo(origin, roleRedirect(stored.role));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.set(sessionCookie.name, token, sessionCookie.options(7 * 86400));
    return response;
  } catch {
    return redirectTo(origin, "/login?erro=oauth-falha");
  }
}