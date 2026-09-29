// The commit currently deployed. The admin panel checks it to notice a new version while it stays open.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ version: process.env.VERCEL_GIT_COMMIT_SHA || 'dev' }, { headers: { 'Cache-Control': 'no-store' } })
}
