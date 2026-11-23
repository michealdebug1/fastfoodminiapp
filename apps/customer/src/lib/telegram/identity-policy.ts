export function isRecoveryEnabledForIdentity(
  identityPhone: string,
  authPhone: string | null | undefined,
  phoneConfirmedAt: string | null | undefined,
): boolean {
  return (
    authPhone === identityPhone &&
    typeof phoneConfirmedAt === "string" &&
    phoneConfirmedAt.length > 0
  );
}

export function recoverySessionMatchesProfile(
  mappedProfileId: string,
  verifiedAuthUserId: string,
): boolean {
  return mappedProfileId === verifiedAuthUserId;
}
