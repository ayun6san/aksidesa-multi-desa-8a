/**
 * API untuk manajemen desa oleh Super Admin
 * GET: List semua desa
 * POST: Buat desa baru
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword, isValidEmail, isValidUsername, isValidPhone, isValidPassword } from '@/lib/auth-utils';
import { generateUniqueDesaSlug } from '@/lib/desa-context';

// GET - List semua desa
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    const desaList = await db.desa.findMany({
      include: {
        _count: {
          select: {
            users: true,
            dusun: true,
            perangkatDesa: { where: { isActive: true } },
            bpd: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // FIX: Use direct desaId from KK and Penduduk models (not through Dusun chain)
    // KK and Penduduk both have a direct desaId field - using it is more accurate
    // and includes KK/Penduduk without a dusunId
    const desaIds = desaList.map(d => d.id);

    const [kkPerDesa, pendudukPerDesa] = await Promise.all([
      db.kK.groupBy({
        by: ['desaId'],
        where: { desaId: { in: desaIds }, isActive: true },
        _count: { id: true },
      }),
      db.penduduk.groupBy({
        by: ['desaId'],
        where: { desaId: { in: desaIds }, isActive: true },
        _count: { id: true },
      }),
    ]);

    const kkCountByDesa: Record<string, number> = {};
    for (const item of kkPerDesa) {
      kkCountByDesa[item.desaId] = item._count.id;
    }

    const pendudukCountByDesa: Record<string, number> = {};
    for (const item of pendudukPerDesa) {
      pendudukCountByDesa[item.desaId] = item._count.id;
    }

    // Attach batch-computed stats to each desa
    const desaWithStats = desaList.map(desa => ({
      ...desa,
      dusun: undefined, // remove internal field
      _count: {
        ...desa._count,
        kk: kkCountByDesa[desa.id] || 0,
        penduduk: pendudukCountByDesa[desa.id] || 0,
      },
    }));

    return NextResponse.json({
      success: true,
      data: desaWithStats,
    });
  } catch (error) {
    console.error('Error getting desa list:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// POST - Buat desa baru
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      // Desa data
      namaDesa,
      kodeDesa,
      kodePos,
      kecamatan,
      kabupaten,
      provinsi,
      alamatKantor,
      telepon,
      email: desaEmail,
      website,
      // Admin desa data (opsional - bisa dibuat nanti)
      createAdmin,
      adminNamaLengkap,
      adminUsername,
      adminEmail,
      adminNoHp,
      adminPassword,
    } = body;

    // Validasi data desa
    const errors: string[] = [];

    if (!namaDesa?.trim()) errors.push('Nama desa wajib diisi');
    if (!kodeDesa?.trim()) errors.push('Kode desa wajib diisi');
    if (!kecamatan?.trim()) errors.push('Kecamatan wajib diisi');
    if (!kabupaten?.trim()) errors.push('Kabupaten wajib diisi');
    if (!provinsi?.trim()) errors.push('Provinsi wajib diisi');

    // Validasi admin desa jika createAdmin = true
    if (createAdmin) {
      if (!adminNamaLengkap?.trim()) errors.push('Nama admin desa wajib diisi');
      
      if (!adminUsername?.trim()) {
        errors.push('Username admin wajib diisi');
      } else if (!isValidUsername(adminUsername)) {
        errors.push('Username admin minimal 3 karakter, hanya boleh huruf, angka, dan underscore');
      }

      if (!adminEmail?.trim()) {
        errors.push('Email admin wajib diisi');
      } else if (!isValidEmail(adminEmail)) {
        errors.push('Format email admin tidak valid');
      }

      if (!adminNoHp?.trim()) {
        errors.push('Nomor HP admin wajib diisi');
      } else if (!isValidPhone(adminNoHp)) {
        errors.push('Format nomor HP admin tidak valid');
      }

      if (!adminPassword) {
        errors.push('Password admin wajib diisi');
      } else if (!isValidPassword(adminPassword)) {
        errors.push('Password admin minimal 6 karakter');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(', ') },
        { status: 400 }
      );
    }

    // Cek duplikasi kode desa
    const existingDesa = await db.desa.findFirst({
      where: {
        OR: [
          { kodeDesa: kodeDesa.trim() },
        ],
      },
    });

    if (existingDesa) {
      return NextResponse.json(
        { error: 'Kode desa sudah digunakan' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = await generateUniqueDesaSlug(namaDesa.trim());

    // Cek duplikasi admin jika createAdmin = true
    if (createAdmin) {
      const existingAdmin = await db.user.findFirst({
        where: {
          OR: [
            { username: adminUsername.toLowerCase().trim() },
            { email: adminEmail.toLowerCase().trim() },
          ],
        },
      });

      if (existingAdmin) {
        if (existingAdmin.username === adminUsername.toLowerCase().trim()) {
          return NextResponse.json(
            { error: 'Username admin sudah digunakan' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'Email admin sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Create desa dan admin dalam transaction
    const result = await db.$transaction(async (tx) => {
      // Create desa
      const newDesa = await tx.desa.create({
        data: {
          namaDesa: namaDesa.trim(),
          slug,
          kodeDesa: kodeDesa.trim(),
          kodePos: kodePos?.trim() || null,
          kecamatan: kecamatan.trim(),
          kabupaten: kabupaten.trim(),
          provinsi: provinsi.trim(),
          alamatKantor: alamatKantor?.trim() || null,
          telepon: telepon?.trim() || null,
          email: desaEmail?.trim() || null,
          website: website?.trim() || null,
          paket: 'GRATIS',
          isActive: true,
        },
      });

      // Create admin desa jika diminta
      let adminUser: Awaited<ReturnType<typeof tx.user.create>> | null = null;
      if (createAdmin) {
        const hashedPassword = await hashPassword(adminPassword);
        
        adminUser = await tx.user.create({
          data: {
            namaLengkap: adminNamaLengkap.trim(),
            username: adminUsername.toLowerCase().trim(),
            email: adminEmail.toLowerCase().trim(),
            noHp: adminNoHp.trim(),
            password: hashedPassword,
            role: 'ADMIN_DESA',
            status: 'ACTIVE',
            desaId: newDesa.id,
          },
        });
      }

      return { desa: newDesa, admin: adminUser };
    });

    return NextResponse.json({
      success: true,
      message: 'Desa berhasil dibuat',
      data: {
        desa: result.desa,
        admin: result.admin ? {
          id: result.admin.id,
          namaLengkap: result.admin.namaLengkap,
          username: result.admin.username,
          email: result.admin.email,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error creating desa:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
