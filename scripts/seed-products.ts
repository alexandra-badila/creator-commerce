/**
 * Fills an empty `products` table with something to look at.
 *
 * The app has no fixtures: a fresh database has the user you signed up as and
 * nothing else, so every storefront and dashboard screen renders its empty
 * state. This writes the rows those screens were designed against.
 *
 * Two columns are deliberately left null/empty, and both are load-bearing:
 *
 * `images` stays `{}`. The urls that column holds are UploadThing ufsUrls, and
 * next.config only allows `**.ufs.sh` in remotePatterns — a made-up url would
 * pass the insert and then throw in next/image at render time. Empty is a state
 * the UI already handles: ProductCover falls back to ProductImagePlaceholder.
 * To get real covers, upload them through the product form.
 *
 * `fileKey` stays null. It is the handle a signed download url is minted from,
 * so a fabricated key would look like a sellable product and fail at the last
 * step. The schema permits null for exactly this reason — rows with no file.
 * Seeded products are therefore browsable but not downloadable.
 *
 * Idempotent: a product is matched by owner and name, and an existing one is
 * left untouched rather than duplicated, so re-running is safe. `--reset` soft-
 * deletes the seeded rows first, which is how you get back to a clean run.
 *
 * Usage:
 *   npm run seed:products
 *   npm run seed:products -- --handle=alexandra
 *   npm run seed:products -- --reset
 */
import { and, eq, inArray, isNull } from 'drizzle-orm'

import db from '@/lib/server/db'
import { user } from '@/lib/server/db/schemas/auth'
import { productsTable, type ProductStatus } from '@/lib/server/db/schemas/product'
import { slugify } from '@/lib/utils'

// Prices are in bani, because that is what the column stores — 2900 renders as
// "29,00 RON" through formatPrice.
const SEED: {
  name: string
  description: string
  priceInCents: number
  status: ProductStatus
}[] = [
  {
    name: 'Golden Hour Presets',
    description:
      '20 warm, filmic Lightroom presets for portraits & travel.',
    priceInCents: 2900,
    status: 'published',
  },
  {
    name: 'Notion Freelance OS',
    description:
      'The all-in-one Notion system to run your freelance business.',
    priceInCents: 1900,
    status: 'published',
  },
  {
    name: 'Ambient Loops Vol. 2',
    description: '24 royalty-free ambient loops for focus and film.',
    priceInCents: 1200,
    status: 'published',
  },
  {
    name: 'Portrait LUT Bundle',
    description: 'Cinematic color LUTs for video — DaVinci & Premiere.',
    priceInCents: 3400,
    status: 'published',
  },
  {
    name: 'Client Contract Kit',
    description: 'Lawyer-reviewed contract templates for creatives.',
    priceInCents: 2200,
    status: 'published',
  },
  {
    name: 'Procreate Brush Set',
    description: '48 textured brushes for illustration and lettering.',
    priceInCents: 1600,
    status: 'published',
  },
  // Two drafts, so the dashboard's product list has both states to render and
  // the storefront has something it must *not* show.
  {
    name: 'Brand Guidelines Template',
    description: 'A 32-page brand book template in Figma and PDF.',
    priceInCents: 2400,
    status: 'draft',
  },
  {
    name: 'Icon Set — Outline 240',
    description: '240 consistent outline icons, SVG and web font.',
    priceInCents: 1500,
    status: 'draft',
  },
]

function parseArgs(argv: string[]) {
  const handle = argv
    .find((a) => a.startsWith('--handle='))
    ?.slice('--handle='.length)
  return { handle, reset: argv.includes('--reset') }
}

/**
 * The owner to hang the products on.
 *
 * With no --handle, this insists on there being exactly one user rather than
 * picking one: on a database with several, guessing writes someone else's
 * storefront full of fixtures.
 */
async function resolveOwner(handle: string | undefined) {
  if (handle) {
    const wanted = handle.replace(/^@/, '')
    const [found] = await db
      .select({ id: user.id, name: user.name, handle: user.handle })
      .from(user)
      .where(eq(user.handle, wanted))
      .limit(1)
    if (!found) throw new Error(`No user with handle "${wanted}".`)
    return found
  }

  const users = await db
    .select({ id: user.id, name: user.name, handle: user.handle })
    .from(user)
    .limit(2)
  if (users.length === 0) throw new Error('No users yet — sign up first.')
  if (users.length > 1) {
    throw new Error('More than one user; pass --handle=<handle> to choose.')
  }
  return users[0]
}

async function main() {
  const { handle, reset } = parseArgs(process.argv.slice(2))
  const owner = await resolveOwner(handle)
  const names = SEED.map((p) => p.name)

  console.log(`Seeding products for ${owner.name} (@${owner.handle}).`)

  if (reset) {
    // Soft-delete, matching how the app deletes: reads filter deletedAt, and a
    // hard delete would take purchases' references with it.
    const removed = await db
      .update(productsTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(productsTable.ownerId, owner.id),
          inArray(productsTable.name, names),
          isNull(productsTable.deletedAt),
        ),
      )
      .returning({ id: productsTable.id })
    console.log(`--reset: soft-deleted ${removed.length} existing seed row(s).`)
  }

  const live = await db
    .select({ name: productsTable.name })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.ownerId, owner.id),
        inArray(productsTable.name, names),
        isNull(productsTable.deletedAt),
      ),
    )
  const existing = new Set(live.map((p) => p.name))

  const toInsert = SEED.filter((p) => !existing.has(p.name)).map((p) => ({
    ownerId: owner.id,
    name: p.name,
    slug: slugify(p.name),
    description: p.description,
    priceInCents: p.priceInCents,
    status: p.status,
  }))

  if (toInsert.length === 0) {
    console.log(`Nothing to do — all ${SEED.length} already present.`)
    return
  }

  const inserted = await db
    .insert(productsTable)
    .values(toInsert)
    .returning({ id: productsTable.id, name: productsTable.name })

  for (const p of inserted) console.log(`  + ${p.id}  ${p.name}`)
  console.log(
    `Inserted ${inserted.length}, skipped ${SEED.length - inserted.length} already present.`,
  )
  console.log(`\nStorefront: /@${owner.handle}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
