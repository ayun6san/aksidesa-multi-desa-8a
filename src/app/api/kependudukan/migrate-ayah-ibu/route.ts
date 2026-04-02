import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Step 1: Find all KKs that have children (ANAK, ANAK_TIRI, ANAK_ANGKAT)
    const children = await db.penduduk.findMany({
      where: {
        hubunganKeluarga: { in: ['ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT'] },
        isActive: true,
        status: { not: 'MENINGGAL' },
        kkId: { not: null },
        ayahId: null,
        ibuId: null,
      },
      select: { id: true, kkId: true },
    });

    let updated = 0;

    // Group by kkId for efficiency
    const kkIds = [...new Set(children.map(c => c.kkId!))];

    for (const kkId of kkIds) {
      // Find all members in this KK
      const members = await db.penduduk.findMany({
        where: {
          kkId,
          isActive: true,
          status: { not: 'MENINGGAL' },
        },
        select: { id: true, hubunganKeluarga: true, jenisKelamin: true },
      });

      const suami = members.find(m => m.hubunganKeluarga === 'SUAMI');
      const istri = members.find(m => m.hubunganKeluarga === 'ISTRI');
      const kepala = members.find(m => m.hubunganKeluarga === 'KEPALA_KELUARGA');
      const childIds = children.filter(c => c.kkId === kkId).map(c => c.id);

      if (childIds.length === 0) continue;

      const updateData: Record<string, string | null> = {};
      // Ayah: SUAMI dulu, fallback KEPALA_KELUARGA laki-laki
      if (suami) updateData.ayahId = suami.id;
      else if (kepala?.jenisKelamin === 'LAKI_LAKI') updateData.ayahId = kepala.id;
      // Ibu: ISTRI dulu, fallback KEPALA_KELUARGA perempuan
      if (istri) updateData.ibuId = istri.id;
      else if (kepala?.jenisKelamin === 'PEREMPUAN') updateData.ibuId = kepala.id;

      if (Object.keys(updateData).length > 0) {
        const result = await db.penduduk.updateMany({
          where: { id: { in: childIds } },
          data: updateData,
        });
        updated += result.count;
      }
    }

    // Step 2: Recalculate statusAnak for all children who have ayahId or ibuId
    const allChildren = await db.penduduk.findMany({
      where: {
        hubunganKeluarga: { in: ['ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT'] },
        isActive: true,
        OR: [
          { ayahId: { not: null } },
          { ibuId: { not: null } },
        ],
      },
      select: { id: true, ayahId: true, ibuId: true },
    });

    let statusUpdated = 0;

    for (const child of allChildren) {
      let ayahAlive = false;
      let ibuAlive = false;

      if (child.ayahId) {
        const ayah = await db.penduduk.findUnique({
          where: { id: child.ayahId },
          select: { status: true, isActive: true },
        });
        ayahAlive = ayah?.isActive === true && ayah?.status !== 'MENINGGAL';
      }

      if (child.ibuId) {
        const ibu = await db.penduduk.findUnique({
          where: { id: child.ibuId },
          select: { status: true, isActive: true },
        });
        ibuAlive = ibu?.isActive === true && ibu?.status !== 'MENINGGAL';
      }

      let newStatus: string;
      if (!ayahAlive && !ibuAlive) {
        newStatus = 'YATIM_PIATU';
      } else if (!ayahAlive) {
        newStatus = 'YATIM';
      } else if (!ibuAlive) {
        newStatus = 'PIATU';
      } else {
        newStatus = 'BUKAN_YATIM_PIATU';
      }

      await db.penduduk.update({
        where: { id: child.id },
        data: { statusAnak: newStatus as any },
      });
      statusUpdated++;
    }

    return NextResponse.json({
      success: true,
      message: 'Migrasi berhasil',
      data: {
        ayahIbuLinked: updated,
        statusAnakCalculated: statusUpdated,
        totalProcessed: updated + statusUpdated,
      },
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menjalankan migrasi' },
      { status: 500 }
    );
  }
}
