export class IdentityError extends Error {
  constructor(code, statusCode = 403) {
    super(code);
    this.name = 'IdentityError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requiredString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new IdentityError(code);
  return value.trim();
}

export async function loadFleetFlowIdentity(db, decodedToken) {
  const uid = requiredString(decodedToken?.uid, 'invalid_token_identity');
  const snapshot = await db.collection('ff_users').where('uid', '==', uid).limit(2).get();

  if (snapshot.empty) throw new IdentityError('identity_not_enrolled');
  if (snapshot.size !== 1) throw new IdentityError('identity_mapping_conflict', 409);

  const userDoc = snapshot.docs[0];
  const user = userDoc.data();
  if (user.active !== true) throw new IdentityError('identity_inactive');

  const companyId = requiredString(user.companyId, 'identity_company_missing');
  const role = requiredString(user.role, 'identity_role_missing');
  const company = await db.collection('ff_company').doc(companyId).get();
  if (!company.exists || company.data()?.active === false) {
    throw new IdentityError('company_inactive');
  }

  const allowedRoles = Array.isArray(user.allowedRoles)
    ? [...new Set(user.allowedRoles.filter((candidate) => typeof candidate === 'string'))]
    : [role];
  if (!allowedRoles.includes(role)) throw new IdentityError('identity_role_invalid');

  return {
    uid,
    username: requiredString(user.username || userDoc.id, 'identity_username_missing'),
    displayName: requiredString(user.displayName || user.name, 'identity_display_name_missing'),
    role,
    companyId,
    ...(user.employeeId ? { employeeId: String(user.employeeId) } : {}),
    allowedRoles,
    membershipVersion: Number.isSafeInteger(user.membershipVersion)
      ? user.membershipVersion
      : 1
  };
}
