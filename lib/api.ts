export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// El backend guarda timestamps de SQLite en UTC ("YYYY-MM-DD HH:MM:SS")
export function parseTimestampUTC(ts: string): Date {
  return new Date(ts.replace(' ', 'T') + 'Z')
}
