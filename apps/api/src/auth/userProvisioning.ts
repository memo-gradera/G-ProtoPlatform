import type { Env } from "../config/env.js";
import { ForbiddenError } from "../errors.js";
import type { EntraTokenIdentity } from "./entraJwt.js";
import { usersRepository } from "../repositories/usersRepository.js";

const UNPROVISIONED_MESSAGE =
  "User is not provisioned in GRADERA Innovation Hub.";

export async function resolveProvisionedUser(
  identity: EntraTokenIdentity,
  env: Env,
) {
  let user = await usersRepository.getByEntraObjectId(identity.entraObjectId);

  if (!user) {
    user = await usersRepository.getByEmail(identity.email);

    if (user && !user.entraObjectId) {
      user = await usersRepository.linkEntraObjectId(
        user.id,
        identity.entraObjectId,
      );
    }
  }

  if (!user) {
    if (
      env.NODE_ENV !== "production" &&
      env.AUTO_PROVISION_DEV_USERS
    ) {
      user = await usersRepository.createProvisionedViewer({
        email: identity.email,
        fullName: identity.fullName,
        entraObjectId: identity.entraObjectId,
      });
      return user;
    }

    throw new ForbiddenError(UNPROVISIONED_MESSAGE);
  }

  return user;
}
