# Utopia Database (TypeScript)

This repository provides a TypeScript implementation of core ideas from the [Utopia PHP Database](https://github.com/utopia-php/database) package. The goal is to offer a Node.js-friendly API that mirrors the ergonomics of the original library while using idiomatic TypeScript classes.

## Features

- `Database` service with helper methods to manage collections and documents.
- `Document` helper that enforces metadata structure and supports nested documents.
- `Query` builder compatible with the JSON query format used by the PHP package.
- Pluggable `Adapter` interface with an in-memory reference implementation for local development and testing.

## Getting started

```bash
npm install
npm run build
```

The build output is emitted to the `dist/` directory and can be consumed from Node.js runtimes that support ES modules.

## Usage example

```ts
import {
  Database,
  MemoryAdapter,
  Query
} from 'utopia-database-ts';

const adapter = new MemoryAdapter();
const database = new Database(adapter);

await database.createCollection({
  name: 'users',
  attributes: [
    { key: 'name', type: 'string' },
    { key: 'age', type: 'integer' }
  ]
});

await database.createDocument('users', { name: 'Ada Lovelace', age: 36 });
await database.createDocument('users', { name: 'Grace Hopper', age: 85 });

const seniorScientists = await database.listDocuments('users', {
  queries: [Query.greaterThanEqual('age', 60)]
});

console.log(seniorScientists.map((user) => user.getAttributes()));
```

## License

MIT
