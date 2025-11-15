import { Database, MemoryAdapter, Query } from '../index.js';

async function main(): Promise<void> {
  const adapter = new MemoryAdapter();
  const database = new Database(adapter);

  await database.createCollection({
    name: 'users',
    attributes: [
      { key: 'name', type: 'string' },
      { key: 'age', type: 'integer' }
    ]
  });

  await database.createDocument('users', {
    name: 'Ada Lovelace',
    age: 36
  });

  await database.createDocument('users', {
    name: 'Grace Hopper',
    age: 85
  });

  const seniors = await database.listDocuments('users', {
    queries: [Query.greaterThanEqual('age', 60)]
  });

  if (seniors.length !== 1 || seniors[0].getAttribute('name') !== 'Grace Hopper') {
    throw new Error('Query filtering failed');
  }

  const sorted = await database.listDocuments('users', {
    queries: [Query.orderAsc('age')]
  });

  const names = sorted.map((user) => user.getAttribute<string>('name'));

  if (names.join(',') !== 'Ada Lovelace,Grace Hopper') {
    throw new Error('Ordering failed');
  }

  console.log('All example checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
