import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ?? 'http://localhost:8080/v1/graphql',
  generates: {
    '../packages/graphql/generated/index.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
