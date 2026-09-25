import {
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  Auth
} from "firebase/auth";
import { SyncTimeoutError, SyncUserError } from "./register-errors";
import { RegisterFormFields } from "./register-validation";

export interface RegisterUserInput extends RegisterFormFields {
  phoneCountryCode: string;
}

export async function registerUser(auth: Auth, input: RegisterUserInput, backendUrl: string): Promise<{ token: string }> {
  const { email, password, firstName, lastName, phone, phoneCountryCode, location } = input;
  
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = credential.user;

  try {
    await updateProfile(user, {
      displayName: `${firstName.trim()} ${lastName.trim()}`,
    });

    const token = await user.getIdToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let syncRes: Response;
    try {
      syncRes = await fetch(`${backendUrl}/api/auth/sync-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phone.trim(),
          country_code: phoneCountryCode,
          location,
        }),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new SyncTimeoutError();
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!syncRes.ok) {
      throw new SyncUserError(syncRes.status);
    }

    return { token };
  } catch (err) {
    await deleteUser(user).catch((rollbackErr) => {
      console.error("[register] rollback failed", rollbackErr);
    });
    throw err;
  }
}
