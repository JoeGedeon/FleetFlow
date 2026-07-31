import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function credentialFromEnvironment(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return applicationDefault();

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  return cert(serviceAccount);
}

export function getFirebaseAdmin(env = process.env) {
  const app = getApps()[0] || initializeApp({
    credential: credentialFromEnvironment(env),
    projectId: env.FIREBASE_PROJECT_ID || undefined
  });

  return {
    auth: getAuth(app),
    db: getFirestore(app)
  };
}
