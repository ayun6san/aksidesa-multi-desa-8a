/**
 * Seed script: Surat Konfigurasi for all 8 desa
 * 
 * Creates SuratKonfigurasi for each desa with:
 * - kodeDesaSurat based on desa name (e.g., "Ds.SukaMaju", "Ds.MekarJaya")
 * - kepalaDesaNama: "Kepala Desa [Nama Desa]"
 * - Default format settings
 * 
 * Run: cd /home/z/my-project && bun run scripts/seed-surat-konfigurasi.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Desa configurations - populated dynamically from database
interface DesaConfig {
  id: string
  namaDesa: string
  kodeDesaSurat: string
  kepalaDesaNama: string
  kepalaDesaNIP: string | null
  sekretarisNama: string | null
  sekretarisNIP: string | null
}

let DESA_CONFIGS: DesaConfig[] = []

// Default configuration settings
const DEFAULT_CONFIG = {
  formatNomorSurat: '{nomor}/{kodeDesa}/{bulan}/{tahun}',
  digitPadding: 3,
  formatBulan: 'ROMAWI' as const,
  resetNomorPer: 'PER_TAHUN',
  formatNomorRegister: '{nomor}/{kodeDesa}/Reg/{tahun}',
  digitPaddingReg: 4,
}

async function main() {
  console.log('=== SEED: Surat Konfigurasi per Desa ===\n')

  // Fetch all desa dynamically
  const allDesa = await prisma.desa.findMany({
    select: { id: true, namaDesa: true, kodeDesa: true },
    orderBy: { kodeDesa: 'asc' },
  })

  if (allDesa.length === 0) {
    console.error('ERROR: No desa found in database.')
    console.error('Please ensure desa are seeded first.')
    process.exit(1)
  }

  // Build configs dynamically
  DESA_CONFIGS = allDesa.map(d => ({
    id: d.id,
    namaDesa: d.namaDesa,
    kodeDesaSurat: `Ds.${d.namaDesa.replace(/\s+/g, '')}`,
    kepalaDesaNama: null,
    kepalaDesaNIP: null,
    sekretarisNama: null,
    sekretarisNIP: null,
  }))

  const desaIds = DESA_CONFIGS.map(d => d.id)

  console.log(`Found ${DESA_CONFIGS.length} desa in database.`)
  console.log(`Seeding ${DESA_CONFIGS.length} surat konfigurasi...\n`)

  let totalCreated = 0
  let totalUpdated = 0

  for (const config of DESA_CONFIGS) {
    // Check if konfigurasi already exists
    const existing = await prisma.suratKonfigurasi.findUnique({
      where: { desaId: config.id },
    })

    if (existing) {
      // Update existing
      await prisma.suratKonfigurasi.update({
        where: { desaId: config.id },
        data: {
          kodeDesaSurat: config.kodeDesaSurat,
          kepalaDesaNama: config.kepalaDesaNama,
          kepalaDesaNIP: config.kepalaDesaNIP,
          sekretarisNama: config.sekretarisNama,
          sekretarisNIP: config.sekretarisNIP,
        },
      })
      console.log(`  ✓ Updated konfigurasi for ${config.namaDesa} (${config.kodeDesaSurat})`)
      totalUpdated++
    } else {
      // Create new
      await prisma.suratKonfigurasi.create({
        data: {
          desaId: config.id,
          kodeDesaSurat: config.kodeDesaSurat,
          kepalaDesaNama: config.kepalaDesaNama,
          kepalaDesaNIP: config.kepalaDesaNIP,
          sekretarisNama: config.sekretarisNama,
          sekretarisNIP: config.sekretarisNIP,
          formatNomorSurat: DEFAULT_CONFIG.formatNomorSurat,
          digitPadding: DEFAULT_CONFIG.digitPadding,
          formatBulan: DEFAULT_CONFIG.formatBulan,
          resetNomorPer: DEFAULT_CONFIG.resetNomorPer,
          formatNomorRegister: DEFAULT_CONFIG.formatNomorRegister,
          digitPaddingReg: DEFAULT_CONFIG.digitPaddingReg,
        },
      })
      console.log(`  ✓ Created konfigurasi for ${config.namaDesa} (${config.kodeDesaSurat})`)
      totalCreated++
    }
  }

  console.log(`\n=== SEED COMPLETE ===`)
  console.log(`Total created: ${totalCreated}`)
  console.log(`Total updated: ${totalUpdated}`)

  // Verification
  const actualCount = await prisma.suratKonfigurasi.count({
    where: { desaId: { in: desaIds } },
  })

  console.log(`\nVerification: ${actualCount} surat konfigurasi in database`)

  // Show all konfigurasi
  console.log('\n--- All Konfigurasi ---')
  const allConfigs = await prisma.suratKonfigurasi.findMany({
    where: { desaId: { in: desaIds } },
    include: {
      desa: {
        select: { namaDesa: true },
      },
    },
    orderBy: { kodeDesaSurat: 'asc' },
  })

  for (const cfg of allConfigs) {
    console.log(`  ${cfg.desa.namaDesa}: ${cfg.kodeDesaSurat}`)
    console.log(`    Format Nomor: ${cfg.formatNomorSurat}`)
    console.log(`    Format Register: ${cfg.formatNomorRegister}`)
    console.log(`    Kepala Desa: ${cfg.kepalaDesaNama || '(belum diatur)'}`)
    console.log(`    Padding: ${cfg.digitPadding} digits, Register: ${cfg.digitPaddingReg} digits`)
    console.log(`    Format Bulan: ${cfg.formatBulan}, Reset: ${cfg.resetNomorPer}`)
    console.log('')
  }

  if (actualCount === DESA_CONFIGS.length) {
    console.log('✅ All desa have surat konfigurasi!')
  } else {
    console.log(`⚠️  Expected ${DESA_CONFIGS.length} but found ${actualCount}. Please investigate.`)
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
