/** Persist the application profile before sending the registration confirmation. */
export async function completeCustomerRegistration<T>(
  user: T,
  saveProfile: (user: T) => Promise<void>,
  sendVerification: (user: T) => Promise<void>,
): Promise<T> {
  await saveProfile(user);
  await sendVerification(user);
  return user;
}
