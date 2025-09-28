#!/usr/bin/env node

import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const email = process.env.TEST_EMAIL || 'test@example.com'
const password = process.env.TEST_PASSWORD || 'password123'
const name = process.env.TEST_NAME || 'Test User'

async function createUser() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is required')
    process.exit(1)
  }
  const client = new MongoClient(mongoUri)

  try {
    await client.connect()
    const db = client.db('rmap_control')

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase()
    })

    if (existingUser) {
      console.log(`User ${email} already exists`)
      console.log('Updating password instead...')

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10)

      // Update the password
      await db.collection('users').updateOne(
        { email: email.toLowerCase() },
        {
          $set: {
            passwordHash,
            updatedAt: new Date().toISOString()
          }
        }
      )

      console.log(`✓ Password updated for ${email}`)
      console.log(`  Password: ${password}`)
      return
    }

    // Create new user
    const userId = `user_${uuidv4()}`
    const passwordHash = await bcrypt.hash(password, 10)

    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      name: name,
      passwordHash,
      emailVerified: true, // Set as verified for testing
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('users').insertOne(newUser)

    console.log(`✓ User created successfully!`)
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Name: ${name}`)
    console.log(`  ID: ${userId}`)
    console.log(`\nYou can now log in with these credentials.`)

    // Check if there are any tenants to associate with
    const tenants = await db.collection('tenants').find({}).toArray()
    if (tenants.length > 0) {
      console.log('\nAvailable tenants:')
      tenants.forEach(t => {
        console.log(`  - ${t.name} (ID: ${t.id}, Slug: ${t.slug})`)
      })
      console.log('\nNote: User is not associated with any tenant yet.')
      console.log('They will need to be invited or added by an admin.')
    }

  } catch (error) {
    console.error('Error creating user:', error)
  } finally {
    await client.close()
  }
}

createUser()