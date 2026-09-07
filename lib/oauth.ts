import crypto from "node:crypto";
import { sign } from "./crypto";
import { safeEqual } from "./crypto";

export type OAuthProvider = "google" | "facebook";

export type OAuthIdentity = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

export type ProviderConfig = {
  id: OAuthProvider;
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scopes: string[];
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  extract: (data: Record<string, unknown>) => OAuthIdentity | null;
};

export class OAuthError extends Error {}

const providers: Record<OAuthProvider, ProviderConfig> = {
  google: {
    id: "google",
    name: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scopes: ["openid", "email", "profile"],
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    extract: (data) => ({
      id: String(data.sub ?? ""),
      email: String(data.email ?? ""),
      emailVerified: data.email_verified === true || data.email_verified === "true",
      name: String(data.name ?? ""),
      picture: typeof data.picture === "string" ? data.picture : null,
    }),
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/v19.0/me",
    scopes: ["email", "public_profile"],
    clientId: () => process.env.FACEBOOK_APP_ID,
    clientSecret: () => process.env.FACEBOOK_APP_SECRET,
    extract: (data) => {
      const picture =
        typeof data.picture === "object" &&
        data.picture !== null &&
        typeof (data.picture as { data?: { url?: unknown } }).data?.url === "string"
          ? (data.picture as { data: { url: string } }).data.url
          : null;
      return {
        id: String(data.id ?? ""),
        email: String(data.email ?? ""),
        emailVerified: String(data.email ?? "") !== "",
        name: String(data.name ?? ""),
        picture,
      };
    },
  },
};

export function getProvider(id: string): ProviderConfig | null {
  return providers[id as OAuthProvider] ?? null;
}

export function isProviderConfigured(id: string): boolean {
  const p = getProvider(id);
  if (!p) return false;
  return Boolean(p.clientId() && p.clientSecret());
}

export function configuredProviders(): Record<OAuthProvider, boolean> {
  return { google: isProviderConfigured("google"), facebook: isProviderConfigured("facebook") };
}

// State assinado para impedir CSRF/login-replay no callback.
export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function signOAuthState(state: string): string {
  return `${state}.${sign(state)}`;
}

export function verifyOAuthState(value: string | undefined): boolean {
  if (!value) return false;
  const [state, sig] = value.split(".");
  if (!state || !sig) return false;
  try {
    return safeEqual(sign(state), sig);
  } catch {
    return false;
  }
}

export function buildAuthorizeUrl(
  providerId: OAuthProvider,
  state: string,
  redirectUri: string
): string {
  const p = providers[providerId];
  const query = new URLSearchParams({
    client_id: p.clientId() as string,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: p.scopes.join(" "),
    state,
  });
  if (providerId === "google") query.set("prompt", "select_account");
  return `${p.authorizeUrl}?${query.toString()}`;
}

export async function exchangeCode(
  providerId: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<string> {
  const p = providers[providerId];
  const body = new URLSearchParams({
    client_id: p.clientId() as string,
    client_secret: p.clientSecret() as string,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new OAuthError(`Falha ao trocar o código OAuth (${res.status})`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new OAuthError("Token ausente na resposta do provedor");
  return data.access_token;
}

export async function fetchIdentity(
  providerId: OAuthProvider,
  accessToken: string
): Promise<OAuthIdentity> {
  const p = providers[providerId];
  const url =
    providerId === "facebook"
      ? `${p.profileUrl}?fields=id,name,email,picture.type(large)`
      : p.profileUrl;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new OAuthError(`Falha ao obter perfil do provedor (${res.status})`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const identity = p.extract(data);
  if (!identity || !identity.id || !identity.email) {
    throw new OAuthError("Identidade inválida retornada pelo provedor");
  }
  return identity;
}