// apps/web/src/graphql/queries/user-queries.ts
import { gql } from "@apollo/client";

export const GET_USER = gql`
  query GetUser {
    users {
      id
      email
      last_seen
    }
  }
`;