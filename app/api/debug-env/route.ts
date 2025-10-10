import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DB_PROVIDER: process.env.DB_PROVIDER,
    HAS_POSTGRES_URL: !!process.env.POSTGRES_URL,
    HAS_POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
    // Don't log the actual connection string for security
  });
}
