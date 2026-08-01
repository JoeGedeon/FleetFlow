export class AuthenticationError extends Error {
  constructor(code = 'unauthorized') {
    super(code);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export async function verifyIdToken(auth, token) {
  if (!token) throw new AuthenticationError();
  try {
    return await auth.verifyIdToken(token, true);
  } catch {
    throw new AuthenticationError();
  }
}
