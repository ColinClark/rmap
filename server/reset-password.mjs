#!/usr/bin/env node

import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const email = process.env.TEST_EMAIL || 'test@example.com'
const newPassword = process.env.TEST_PASSWORD || 'password123'

async function resetPassword() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is required')
    process.exit(1)
  }
  const client = new MongoClient(mongoUri)

  try {
    await client.connect()
    const db = client.db('rmap_control')

    // Check if user exists
    const user = await db.collection('users').findOne({
      email: email.toLowerCase()
    })

    if (!user) {
      console.log(`User ${email} not found in database`)

      // Let's check all users to see what's there
      const allUsers = await db.collection('users').find({}).toArray()
      console.log('\nExisting users in database:')
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id || u._id})`)
      })

      return
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update the user's password
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          passwordHash,
          updatedAt: new Date().toISOString()
        },
        $unset: {
          passwordResetToken: '',
          passwordResetExpires: ''
        }
      }
    )

    if (result.modifiedCount > 0) {
      console.log(`✓ Password successfully reset for ${email}`)
      console.log(`  New password: ${newPassword}`)
      console.log(`  User ID: ${user.id || user._id}`)
      console.log(`  User Name: ${user.name}`)
    } else {
      console.log(`Failed to update password for ${email}`)
    }

  } catch (error) {
    console.error('Error resetting password:', error)
  } finally {
    await client.close()
  }
}

resetPassword()