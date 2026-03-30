import path from 'node:path';

import type { CodegenConfig } from '@graphql-codegen/cli';

const stubSchemaPath = path.join(process.cwd(), 'graphql-codegen.schema.graphql');

/**
 * Schema source for graphql-codegen:
 * - CODEGEN_SCHEMA_URL — HTTP(S) GraphQL endpoint or path to a .graphql file (e.g. when Hasura is running)
 * - Otherwise — committed stub so codegen succeeds in CI / without Docker
 */
const schema =
  process.env.CODEGEN_SCHEMA_URL ?? stubSchemaPath;

const config: CodegenConfig = {
  schema,
  generates: {
    '../../packages/graphql/generated/index.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
