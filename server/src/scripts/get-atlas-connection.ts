/**
 * Script to get MongoDB Atlas connection string using Admin API
 *
 * The credentials in your .env file are MongoDB Atlas Admin API credentials.
 * These are used to manage clusters programmatically, not connect to databases.
 *
 * To get your database connection string:
 *
 * Option 1: MongoDB Atlas Console (Easiest)
 * 1. Go to https://cloud.mongodb.com
 * 2. Sign in to your account
 * 3. Select your project (ID: 68d2407459efd959c15a1fc7)
 * 4. Click "Connect" on your cluster
 * 5. Choose "Connect your application"
 * 6. Copy the connection string
 * 7. Add it to .env as: MONGODB_URI="mongodb+srv://..."
 *
 * Option 2: Using Atlas Admin API (Below)
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load .env from project root using absolute path
dotenv.config({ path: '/Users/colin.clark/Dev/rmap/.env' });

async function getAtlasConnectionString() {
  const projectId = process.env.MONGODB_PROJECT_ID;
  const publicKey = process.env.MONGODB_CLIENT_ID;
  const privateKey = process.env.MONGODB_CLIENT_SECRET;

  if (!projectId || !publicKey || !privateKey) {
    console.error('Missing MongoDB Atlas API credentials');
    return;
  }

  try {
    // Get clusters in the project
    const clustersUrl = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/clusters`;

    console.log('Fetching clusters from Atlas...');

    const response = await axios.get(clustersUrl, {
      auth: {
        username: publicKey,
        password: privateKey
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      console.log('\n=== MongoDB Atlas Clusters ===\n');

      response.data.results.forEach((cluster: any) => {
        console.log(`Cluster Name: ${cluster.name}`);
        console.log(`State: ${cluster.stateName}`);
        console.log(`MongoDB Version: ${cluster.mongoDBVersion}`);
        console.log(`Cluster Tier: ${cluster.clusterType}`);

        // Connection strings
        if (cluster.connectionStrings) {
          console.log('\nConnection Strings:');
          console.log(`Standard: ${cluster.connectionStrings.standard}`);
          console.log(`SRV: ${cluster.connectionStrings.standardSrv}`);

          console.log('\n📝 Add this to your .env file:');
          console.log(`MONGODB_URI="${cluster.connectionStrings.standardSrv}"`);
          console.log('\nReplace <password> with your database user password');
        }
        console.log('\n---\n');
      });

      console.log(`
Next Steps:
1. Create a database user in Atlas if you haven't already
2. Add the connection string to your .env file
3. Replace <password> with your database user's password
4. Ensure your IP address is whitelisted in Atlas Network Access
`);
    } else {
      console.log('No clusters found in this project');
      console.log('You may need to create a cluster first at https://cloud.mongodb.com');
    }

  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('Authentication failed. Check your Atlas API credentials.');
    } else if (error.response?.status === 403) {
      console.error('Access denied. Ensure your API key has the necessary permissions.');
    } else {
      console.error('Error fetching cluster info:', error.message);
    }

    console.log('\n💡 Alternative: Get your connection string manually from:');
    console.log('https://cloud.mongodb.com/v2/' + projectId + '#clusters');
  }
}

// Run the script
getAtlasConnectionString();