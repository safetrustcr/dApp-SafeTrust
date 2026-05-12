import { auth } from "@/lib/firebase";

connectionParams: async () => {
  const currentUser = auth.currentUser;
  const token = currentUser ? await currentUser.getIdToken() : null;
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
},