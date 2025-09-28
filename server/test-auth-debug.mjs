#!/usr/bin/env node

import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const email = process.env.TEST_EMAIL || 'test@example.com'
const password = process.env.TEST_PASSWORD || 'password123'

async function debugAuth() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is required')
    process.exit(1)
  }
  const client = new MongoClient(mongoUri)

  try {
    await client.connect()
    const db = client.db('rmap_control')
    const usersCollection = db.collection('users')

    console.log('=== AUTH DEBUG ===')
    console.log('Looking for user:', email)

    // Method 1: Direct lookup
    const user1 = await usersCollection.findOne({ email: email.toLowerCase() })
    console.log('\n1. Direct email lookup:', user1 ? 'FOUND' : 'NOT FOUND')
    if (user1) {
      console.log('   User ID:', user1.id || user1._id)
      console.log('   Email in DB:', user1.email)
    }

    // Method 2: Case-insensitive regex
    const user2 = await usersCollection.findOne({
      email: { $regex: new RegExp('^' + email + '$', 'i') }
    })
    console.log('\n2. Regex lookup:', user2 ? 'FOUND' : 'NOT FOUND')

    // List all users
    const allUsers = await usersCollection.find({}).toArray()
    console.log('\n3. All users in DB:')
    allUsers.forEach(u => {
      console.log(`   - ${u.email} (ID: ${u.id || u._id})`)
    })

    // Test password if user found
    if (user1 && user1.passwordHash) {
      console.log('\n4. Password test:')
      const match = await bcrypt.compare(password, user1.passwordHash)
      console.log('   Password matches:', match)

      if (!match) {
        // Try creating a new hash and comparing
        const newHash = await bcrypt.hash(password, 10)
        console.log('   Current hash:', user1.passwordHash.substring(0, 20) + '...')
        console.log('   New hash would be:', newHash.substring(0, 20) + '...')
      }
    }

    // Check what getUserByEmail might be looking for
    console.log('\n5. Testing various lookups:')
    const testQueries = [
      { email: 'db@clark.ws' },
      { email: 'DB@clark.ws' },
      { email: 'db@Clark.ws' }
    ]

    for (const query of testQueries) {
      const found = await usersCollection.findOne(query)
      console.log(`   Query ${JSON.stringify(query)}: ${found ? 'FOUND' : 'NOT FOUND'}`)
    }

  } finally {
    await client.close()
  }
}

debugAuth()