import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RtRow {
  rtId: string;
  rtNomor: string;
  lakiLaki: number;
  perempuan: number;
  total: number;
  kkCount: number;
  kepadatan: number;
  sexRatio: number;
}

interface RwRow {
  rwId: string;
  rwNomor: string;
  lakiLaki: number;
  perempuan: number;
  total: number;
  kkCount: number;
  kepadatan: number;
  sexRatio: number;
  rtList: RtRow[];
}

interface DusunRow {
  dusunId: string;
  dusunNama: string;
  lakiLaki: number;
  perempuan: number;
  total: number;
  kkCount: number;
  kepadatan: number;
  sexRatio: number;
  rwList: RwRow[];
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Tidak memiliki akses' }, { status: 401 });
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json({ success: false, error: desaAccess.error }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dusunId = searchParams.get('dusunId') || '';
    const rwId = searchParams.get('rwId') || '';
    const sortBy = searchParams.get('sort') || 'nama';
    const sortOrder = searchParams.get('order') || 'asc';

    // Build KK-based where (filter penduduk through KK)
    const kkWhere: Record<string, unknown> = { isActive: true };
    if (desaAccess.desaId) kkWhere.desaId = desaAccess.desaId;
    if (rwId) {
      const rw = await db.rW.findFirst({
        where: { id: rwId },
        include: { rt: { select: { id: true } } },
      });
      if (rw) kkWhere.rtId = { in: rw.rt.map(r => r.id) };
    } else if (dusunId) {
      kkWhere.dusunId = dusunId;
    }

    // Get all KK with their RT assignment (to link penduduk to wilayah)
    const kkList = await db.kK.findMany({
      where: kkWhere,
      select: { id: true, rtId: true, dusunId: true, desaId: true },
    });

    // Map kkId -> rtId for fast lookup
    const kkToRt = new Map<string, string | null>();
    for (const kk of kkList) {
      kkToRt.set(kk.id, kk.rtId);
    }

    // Get all penduduk TETAP with their KK
    const pendudukWhere: Record<string, unknown> = { status: 'TETAP', isActive: true };
    if (desaAccess.desaId) pendudukWhere.desaId = desaAccess.desaId;

    const pendudukList = await db.penduduk.findMany({
      where: pendudukWhere,
      select: {
        jenisKelamin: true,
        kkId: true,
      },
    });

    // Count penduduk per RT (through KK link)
    const rtCounts = new Map<string, { lakiLaki: number; perempuan: number }>();
    // Count penduduk per KK (for KK without RT)
    const kkNoRtCounts = new Map<string, { lakiLaki: number; perempuan: number }>();

    for (const p of pendudukList) {
      const rtId = p.kkId ? kkToRt.get(p.kkId) : null;
      const counts = { lakiLaki: 0, perempuan: 0 };
      if (p.jenisKelamin === 'LAKI_LAKI') counts.lakiLaki = 1;
      else counts.perempuan = 1;

      if (rtId) {
        const existing = rtCounts.get(rtId) || { lakiLaki: 0, perempuan: 0 };
        existing.lakiLaki += counts.lakiLaki;
        existing.perempuan += counts.perempuan;
        rtCounts.set(rtId, existing);
      }
      // Penduduk whose KK has no RT
      if (p.kkId) {
        if (!rtId) {
          const existing = kkNoRtCounts.get(p.kkId) || { lakiLaki: 0, perempuan: 0 };
          existing.lakiLaki += counts.lakiLaki;
          existing.perempuan += counts.perempuan;
          kkNoRtCounts.set(p.kkId, existing);
        }
      }
    }

    // Count KK per RT
    const kkPerRt = new Map<string, number>();
    for (const kk of kkList) {
      if (kk.rtId) {
        kkPerRt.set(kk.rtId, (kkPerRt.get(kk.rtId) || 0) + 1);
      }
    }
    // Count KK without RT per dusun (for dusun total)
    const kkNoRtPerDusun = new Map<string, number>();
    for (const kk of kkList) {
      if (!kk.rtId && kk.desaId) {
        // Get dusun from KK's dusunId field
        // We'll handle this via raw query below if needed
      }
    }

    // Build Dusun hierarchy from DB
    const whereDusun: Record<string, unknown> = {};
    if (desaAccess.desaId) whereDusun.desaId = desaAccess.desaId;
    if (dusunId) whereDusun.id = dusunId;

    const dusunList = await db.dusun.findMany({
      where: whereDusun,
      orderBy: { nama: 'asc' },
      include: {
        rw: {
          orderBy: { nomor: 'asc' },
          include: {
            rt: {
              orderBy: { nomor: 'asc' },
              select: { id: true, nomor: true, rwId: true },
            },
          },
        },
      },
    });

    // Count KK without RT per dusun
    const kkAllList = await db.kK.findMany({
      where: kkWhere,
      select: { id: true, rtId: true, dusunId: true },
    });
    for (const kk of kkAllList) {
      if (!kk.rtId && kk.dusunId) {
        kkNoRtPerDusun.set(kk.dusunId, (kkNoRtPerDusun.get(kk.dusunId) || 0) + 1);
      }
    }

    // Helper: compute kepadatan & sex ratio
    const calcDensity = (penduduk: number, kk: number) => kk > 0 ? Math.round((penduduk / kk) * 10) / 10 : 0;
    const calcSexRatio = (l: number, p: number) => p > 0 ? Math.round((l / p) * 1000) / 100 : 0;

    // Build hierarchical structure
    const result: DusunRow[] = [];

    // Collect RT IDs that belong to known hierarchy
    const knownRtIds = new Set<string>();
    for (const dusun of dusunList) {
      for (const rw of dusun.rw) {
        for (const rt of rw.rt) {
          knownRtIds.add(rt.id);
        }
      }
    }

    let unassignedPenduduk = { lakiLaki: 0, perempuan: 0 };
    let unassignedKK = 0;

    for (const dusun of dusunList) {
      const dusunRow: DusunRow = {
        dusunId: dusun.id,
        dusunNama: dusun.nama,
        lakiLaki: 0,
        perempuan: 0,
        total: 0,
        kkCount: 0,
        kepadatan: 0,
        sexRatio: 0,
        rwList: [],
      };

      for (const rw of dusun.rw) {
        const rwRow: RwRow = {
          rwId: rw.id,
          rwNomor: rw.nomor,
          lakiLaki: 0,
          perempuan: 0,
          total: 0,
          kkCount: 0,
          kepadatan: 0,
          sexRatio: 0,
          rtList: [],
        };

        for (const rt of rw.rt) {
          const counts = rtCounts.get(rt.id) || { lakiLaki: 0, perempuan: 0 };
          const total = counts.lakiLaki + counts.perempuan;
          const kkCount = kkPerRt.get(rt.id) || 0;
          const rtRow: RtRow = {
            rtId: rt.id,
            rtNomor: rt.nomor,
            lakiLaki: counts.lakiLaki,
            perempuan: counts.perempuan,
            total,
            kkCount,
            kepadatan: calcDensity(total, kkCount),
            sexRatio: calcSexRatio(counts.lakiLaki, counts.perempuan),
          };
          rwRow.rtList.push(rtRow);
          rwRow.lakiLaki += rtRow.lakiLaki;
          rwRow.perempuan += rtRow.perempuan;
          rwRow.total += rtRow.total;
          rwRow.kkCount += rtRow.kkCount;
        }

        rwRow.kepadatan = calcDensity(rwRow.total, rwRow.kkCount);
        rwRow.sexRatio = calcSexRatio(rwRow.lakiLaki, rwRow.perempuan);

        dusunRow.rwList.push(rwRow);
        dusunRow.lakiLaki += rwRow.lakiLaki;
        dusunRow.perempuan += rwRow.perempuan;
        dusunRow.total += rwRow.total;
        dusunRow.kkCount += rwRow.kkCount;
      }

      // Add KK without RT to dusun total
      const noRtKK = kkNoRtPerDusun.get(dusun.id) || 0;
      dusunRow.kkCount += noRtKK;

      dusunRow.kepadatan = calcDensity(dusunRow.total, dusunRow.kkCount);
      dusunRow.sexRatio = calcSexRatio(dusunRow.lakiLaki, dusunRow.perempuan);

      result.push(dusunRow);
    }

    // Count penduduk whose KK has no RT (not assigned to any known RT)
    for (const [kkId, counts] of kkNoRtCounts.entries()) {
      const rtId = kkToRt.get(kkId);
      if (!rtId || !knownRtIds.has(rtId)) {
        unassignedPenduduk.lakiLaki += counts.lakiLaki;
        unassignedPenduduk.perempuan += counts.perempuan;
        unassignedKK += 1;
      }
    }

    // Sort dusun
    result.sort((a, b) => {
      const dir = sortOrder === 'desc' ? -1 : 1;
      switch (sortBy) {
        case 'total': return (a.total - b.total) * dir;
        case 'lakiLaki': return (a.lakiLaki - b.lakiLaki) * dir;
        case 'perempuan': return (a.perempuan - b.perempuan) * dir;
        case 'kepadatan': return (a.kepadatan - b.kepadatan) * dir;
        case 'sexRatio': return (a.sexRatio - b.sexRatio) * dir;
        default: return a.dusunNama.localeCompare(b.dusunNama) * dir;
      }
    });

    // Grand total
    const grandTotal = result.reduce((acc, d) => ({
      lakiLaki: acc.lakiLaki + d.lakiLaki,
      perempuan: acc.perempuan + d.perempuan,
      total: acc.total + d.total,
    }), { lakiLaki: unassignedPenduduk.lakiLaki, perempuan: unassignedPenduduk.perempuan, total: unassignedPenduduk.lakiLaki + unassignedPenduduk.perempuan });

    const totalKK = result.reduce((acc, d) => acc + d.kkCount, 0) + unassignedKK;

    return NextResponse.json({
      success: true,
      data: {
        wilayah: result,
        grandTotal,
        totalDusun: result.length,
        totalRW: result.reduce((acc, d) => acc + d.rwList.length, 0),
        totalRT: result.reduce((acc, d) => acc + d.rwList.reduce((a, rw) => a + rw.rtList.length, 0), 0),
        totalKK,
        grandKepadatan: totalKK > 0 ? Math.round((grandTotal.total / totalKK) * 10) / 10 : 0,
        grandSexRatio: grandTotal.perempuan > 0 ? Math.round((grandTotal.lakiLaki / grandTotal.perempuan) * 1000) / 100 : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching statistik wilayah:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data statistik wilayah' }, { status: 500 });
  }
}
