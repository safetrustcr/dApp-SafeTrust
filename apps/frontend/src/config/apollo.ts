import { auth } from "@/lib/firebase";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

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

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ?? "http://localhost:8080/v1/graphql",
});

export const apolloClient = new ApolloClient({
  link: from([authLink as unknown as ApolloLink, httpLink]),
  cache: new InMemoryCache(),
});