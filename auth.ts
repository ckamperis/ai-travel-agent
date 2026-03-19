import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

console.log("[Auth] Gmail scopes requested: openid email profile gmail.readonly");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // First login — capture tokens from Google OAuth response
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        return token;
      } else if (Date.now() < (token.expiresAt as number) * 1000) {
        // Token still valid
        return token;
      } else {
        // Token expired — refresh
        if (!token.refreshToken)
          throw new TypeError("Missing refresh_token");

        try {
          const response = await fetch(
            "https://oauth2.googleapis.com/token",
            {
              method: "POST",
              body: new URLSearchParams({
                client_id: process.env.AUTH_GOOGLE_ID!,
                client_secret: process.env.AUTH_GOOGLE_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
              }),
            }
          );

          const tokens = await response.json();

          if (!response.ok) throw tokens;

          token.accessToken = tokens.access_token;
          token.expiresAt = Math.floor(
            Date.now() / 1000 + tokens.expires_in
          );
          // Some providers only issue refresh tokens once
          if (tokens.refresh_token) {
            token.refreshToken = tokens.refresh_token;
          }
          return token;
        } catch (error) {
          console.error("Error refreshing access_token", error);
          token.error = "RefreshTokenError";
          return token;
        }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as
        | "RefreshTokenError"
        | undefined;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshTokenError";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    expiresAt?: number;
    refreshToken?: string;
    error?: "RefreshTokenError";
  }
}
