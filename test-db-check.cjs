const { MongoClient } = require('mongodb');

async function checkData() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const controlDb = client.db('rmap_control');
  
  // Check users
  const users = await controlDb.collection('users').find({}).limit(2).toArray();
  console.log('Users:', JSON.stringify(users, null, 2));
  
  // Check tenant users
  const tenantUsers = await controlDb.collection('tenant_users').find({}).limit(2).toArray();
  console.log('\nTenant Users:', JSON.stringify(tenantUsers, null, 2));
  
  await client.close();
}

checkData().catch(console.error);
