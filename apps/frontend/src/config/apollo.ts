import { auth } from "@/lib/firebase";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  from,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// The browser authenticates to Hasura only with the user's Firebase ID token.
// Hasura (JWT mode) applies role permissions from its claims; signed-out
// requests fall back to HASURA_GRAPHQL_UNAUTHORIZED_ROLE (anonymous). Never
// send x-hasura-admin-secret from here — see scripts/check-client-secrets.sh.
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

const wsLink = typeof window !== "undefined"
  ? new GraphQLWsLink(
      createClient({
        url: (process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ?? "http://localhost:8080/v1/graphql").replace("http", "ws"),
        connectionParams: async () => {
          const currentUser = auth.currentUser;
          const token = currentUser ? await currentUser.getIdToken() : null;
          return {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          };
        },
      })
    )
  : null;

const splitLink = typeof window !== "undefined" && wsLink != null
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      from([authLink as unknown as ApolloLink, httpLink])
    )
  : from([authLink as unknown as ApolloLink, httpLink]);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});