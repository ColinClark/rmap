#!/usr/bin/env node

import { MongoClient } from 'mongodb';

async function checkTenant() {
  const client = await MongoClient.connect('mongodb+srv://rmap-admin:IFMOoFpkb2bXSFOl@cluster0.7b2yw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  const db = client.db('rmap_control');

  const tenant = await db.collection('tenants').findOne({ id: 'demo-tenant-id' });
  console.log('Tenant found by id:', tenant ? 'Yes' : 'No');
  if (tenant) {
    console.log('Tenant:', {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    });
  }

  const tenantUsers = await db.collection('tenant_users').find({ tenantId: 'demo-tenant-id' }).toArray();
  console.log('Tenant users:', tenantUsers.length);
  tenantUsers.forEach(tu => {
    console.log('  User:', tu.userId, 'Role:', tu.tenantRole);
  });

  client.close();
}

checkTenant().catch(console.error);