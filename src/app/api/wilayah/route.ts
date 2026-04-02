import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Get all wilayah (Dusun, RW, RT) for dropdown filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dusunId = searchParams.get('dusunId') || '';

    // Get desa filter based on user role
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    // Build where clause for dusun
    const dusunWhere: Record<string, unknown> = {};
    if (desaAccess.desaId) {
      dusunWhere.desaId = desaAccess.desaId;
    }

    // Get all Dusun with RW and RT
    const dusunList = await db.dusun.findMany({
      where: dusunWhere,
      select: {
        id: true,
        nama: true,
        kode: true,
        desaId: true,
        rw: {
          select: {
            id: true,
            nomor: true,
            rt: {
              select: {
                id: true,
                nomor: true,
              },
              orderBy: { nomor: 'asc' }
            }
          },
          orderBy: { nomor: 'asc' }
        }
      },
      orderBy: { nama: 'asc' }
    });

    // If dusunId is provided, get RT list for that dusun
    let rtList: unknown[] = [];
    if (dusunId) {
      // Verify dusun belongs to user's desa (if not super admin)
      if (desaAccess.desaId) {
        const targetDusun = await db.dusun.findUnique({
          where: { id: dusunId },
          select: { desaId: true },
        });
        if (!targetDusun || targetDusun.desaId !== desaAccess.desaId) {
          return NextResponse.json(
            { success: false, error: 'Dusun tidak ditemukan' },
            { status: 404 }
          );
        }
      }

      const dusun = await db.dusun.findUnique({
        where: { id: dusunId },
        include: {
          rw: {
            include: {
              rt: {
                select: {
                  id: true,
                  nomor: true,
                  _count: {
                    select: { kk: true }
                  }
                },
                orderBy: { nomor: 'asc' }
              }
            },
            orderBy: { nomor: 'asc' }
          }
        }
      });

      if (dusun) {
        rtList = dusun.rw.flatMap(rw => 
          rw.rt.map(rt => ({
            id: rt.id,
            nomor: rt.nomor,
            rwNomor: rw.nomor,
            label: `RT ${rt.nomor} / RW ${rw.nomor}`,
            jumlahKK: rt._count.kk
          }))
        );
      }
    }

    // Transform dusun data - count RT through RW
    const transformedDusun = dusunList.map(dusun => {
      const allRT = dusun.rw.flatMap(rw => rw.rt);
      return {
        id: dusun.id,
        nama: dusun.nama,
        kode: dusun.kode,
        desaId: dusun.desaId,
        jumlahRT: allRT.length,
        rwList: dusun.rw.map(rw => ({
          id: rw.id,
          nomor: rw.nomor,
          jumlahRT: rw.rt.length,
          rtList: rw.rt
        }))
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        dusun: transformedDusun,
        rt: rtList,
      }
    });
  } catch (error) {
    console.error('Error fetching wilayah:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data wilayah' },
      { status: 500 }
    );
  }
}
