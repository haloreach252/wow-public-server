import { PrismaClient } from '../src/generated/prisma/client.js'
import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

// Admin email to seed
const ADMIN_EMAIL = 'haloreach252@gmail.com'

async function main() {
  console.log('🌱 Seeding database...')

  // Seed admin user role
  await seedAdminUser()
}

async function seedAdminUser() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️  Skipping admin seeding: Missing Supabase environment variables')
    console.log('   Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY to enable admin seeding')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log(`🔍 Looking up user with email: ${ADMIN_EMAIL}`)

  // Use admin API to list users and find by email
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error listing users:', listError.message)
    return
  }

  const adminUser = usersData.users.find(u => u.email === ADMIN_EMAIL)

  if (!adminUser) {
    console.log(`⚠️  User with email ${ADMIN_EMAIL} not found in Supabase`)
    console.log('   Please register this user on the website first, then re-run seeding')
    return
  }

  console.log(`✅ Found user: ${adminUser.id}`)

  // Upsert the admin role
  const userRole = await prisma.userRole.upsert({
    where: { supabaseUserId: adminUser.id },
    update: {
      role: 'admin',
      allowedEnvs: [],
    },
    create: {
      supabaseUserId: adminUser.id,
      role: 'admin',
      allowedEnvs: [],
    },
  })

  console.log(`✅ Admin role assigned to ${ADMIN_EMAIL} (ID: ${userRole.id})`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
