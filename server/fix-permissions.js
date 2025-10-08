import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

async function fixPermissions() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('rmap_control');
    const tenantUsers = db.collection('tenant_users');

    // Update the user's permissions
    const result = await tenantUsers.updateOne(
      {
        userId: 'user_a5d10863-6be8-4758-b572-4b5a722babda',
        tenantId: 'tenant_1759058518111'
      },
      {
        $set: {
          permissions: ['campaigns', 'analytics', 'users', 'settings', 'retail_media', 'data', 'admin']
        }
      }
    );

    console.log('Update result:', result);

    // Verify the update
    const user = await tenantUsers.findOne({
      userId: 'user_a5d10863-6be8-4758-b572-4b5a722babda',
      tenantId: 'tenant_1759058518111'
    });

    console.log('Updated user permissions:', user);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixPermissions();
