import { gql } from "@apollo/client";

// ── Queries ──────────────────────────────────────────────────────────────────

export const GET_APARTMENTS = gql`
  query GetApartments($limit: Int!, $offset: Int!, $owner_id: String) {
    apartments(
      limit: $limit
      offset: $offset
      where: { deleted_at: { _is_null: true }, owner_id: { _eq: $owner_id } }
      order_by: { created_at: desc }
    ) {
      id
      name
      description
      price
      warranty_deposit
      is_available
      image_urls
      address
      available_from
      available_until
      created_at
      owner_id
    }
    apartments_aggregate(
      where: { deleted_at: { _is_null: true }, owner_id: { _eq: $owner_id } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_ALL_APARTMENTS = gql`
  query GetAllApartments($limit: Int!, $offset: Int!) {
    apartments(
      limit: $limit
      offset: $offset
      where: { deleted_at: { _is_null: true }, is_available: { _eq: true } }
      order_by: { created_at: desc }
    ) {
      id
      name
      description
      price
      warranty_deposit
      is_available
      image_urls
      address
      available_from
      available_until
      owner_id
    }
    apartments_aggregate(
      where: { deleted_at: { _is_null: true }, is_available: { _eq: true } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const CREATE_APARTMENT = gql`
  mutation CreateApartment(
    $owner_id: String!
    $name: String!
    $description: String
    $price: numeric!
    $warranty_deposit: numeric!
    $address: jsonb!
    $coordinates: point!
    $is_available: Boolean!
    $available_from: timestamptz!
    $available_until: timestamptz
    $image_urls: [String!]
  ) {
    insert_apartments_one(
      object: {
        owner_id: $owner_id
        name: $name
        description: $description
        price: $price
        warranty_deposit: $warranty_deposit
        address: $address
        coordinates: $coordinates
        is_available: $is_available
        available_from: $available_from
        available_until: $available_until
        image_urls: $image_urls
      }
    ) {
      id
      name
      price
      is_available
      created_at
    }
  }
`;

export const GET_APARTMENT_BY_ID = gql`
  query GetApartmentById($id: uuid!) {
    apartments_by_pk(id: $id) {
      id
      name
      description
      image_urls
      address
      price
      owner_id
    }
  }
`;

export const DELETE_APARTMENT = gql`
  mutation SoftDeleteApartment($id: uuid!, $deleted_at: timestamptz!) {
    update_apartments_by_pk(
      pk_columns: { id: $id }
      _set: { deleted_at: $deleted_at }
    ) {
      id
    }
  }
`;