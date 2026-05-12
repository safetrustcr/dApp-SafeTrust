import { auth } from "@/lib/firebase";

const authLink = setContext(async (_, { headers }) => {
  const currentUser = auth.currentUser;
  const token = currentUser ? await currentUser.getIdToken() : null;

  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});