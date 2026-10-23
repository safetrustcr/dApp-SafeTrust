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
  headers: {
    // TODO: wire in Batch N replace with JWT role claim for production
    "x-hasura-admin-secret": process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET ?? "myadminsecretkey",
  },
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
              "x-hasura-admin-secret": process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET ?? "myadminsecretkey",
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