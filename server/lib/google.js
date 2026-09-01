import dotenv from 'dotenv';

dotenv.config();

// Validation des tokens d'ID Google reçus depuis le bouton "Continuer avec Google".
// On importe google-auth-library dynamiquement pour vérifier le token et en
// extraire l'identité (email, nom, photo) auprès de Google.
let googleClient = null;

async function getClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }
  if (!googleClient) {
    const { OAuth2Client } = await import('google-auth-library');
    googleClient = new OAuth2Client(clientId);
  }
  return googleClient;
}

// Vérifie un token d'ID Google et renvoie le profil validé :
// { email, name, picture, sub } — ou null si invalide / non configuré.
export async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    return null;
  }
  const client = await getClient();
  if (!client) {
    return null; // GOOGLE_CLIENT_ID non configuré : Google désactivé
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return null;
    }
    return {
      email: payload.email,
      name: payload.name || null,
      picture: payload.picture || null,
      googleId: payload.sub,
    };
  } catch {
    return null;
  }
}
