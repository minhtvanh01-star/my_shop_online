import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';
import { googleProfileFromPayload, type GoogleIdProfile } from './google-profile';

export type { GoogleIdProfile };
export { googleProfileFromPayload };

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdProfile> {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new AppError(503, 'Google sign-in is not configured', 'GOOGLE_NOT_CONFIGURED');
  }

  const client = new OAuth2Client(clientId);
  let payload: { sub?: string; email?: string; email_verified?: boolean; name?: string } | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, 'Invalid Google token', 'INVALID_GOOGLE_TOKEN');
  }

  const profile = payload ? googleProfileFromPayload(payload) : null;
  if (!profile) {
    throw new AppError(401, 'Google account is missing email', 'INVALID_GOOGLE_TOKEN');
  }
  if (!profile.emailVerified) {
    throw new AppError(401, 'Google email is not verified', 'GOOGLE_EMAIL_UNVERIFIED');
  }
  return profile;
}
