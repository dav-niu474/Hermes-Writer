import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Required for Neon serverless in Node.js environments
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Get the database URL based on environment.
 * On Vercel, uses the Vercel Postgres (Neon) connection URL.
 * Locally, falls back to DATABASE_URL env var.
 */
function getDatabaseUrl(): string {
  // Vercel Postgres env vars (auto-set by Vercel Postgres store)
  const vercelPrismaUrl = process.env.harmesWriter_POSTGRES_PRISMA_URL
  if (vercelPrismaUrl) return vercelPrismaUrl

  const vercelUrl = process.env.POSTGRES_PRISMA_URL
  if (vercelUrl) return vercelUrl

  // Standard DATABASE_URL
  const standardUrl = process.env.DATABASE_URL
  if (standardUrl) return standardUrl

  // Should never reach here on Vercel
  throw new Error('No database URL configured. Set harmesWriter_POSTGRES_PRISMA_URL or DATABASE_URL.')
}

/**
 * Detect if we should use the Neon adapter (serverless environments).
 */
function shouldUseNeonAdapter(): boolean {
  const url = getDatabaseUrl()
  return url.includes('neon.tech') || url.includes('pgbouncer') || process.env.VERCEL === '1'
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl()

  if (shouldUseNeonAdapter()) {
    // Use Neon adapter for serverless / Vercel Postgres
    const pool = new Pool({ connectionString: databaseUrl })
    const adapter = new PrismaNeon(pool)
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })
  }

  // Direct connection (local dev with Postgres)
  return new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// In development, reuse the client to avoid exhausting connections
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
