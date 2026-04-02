import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }

    const session = await db.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
            email: true,
            role: true,
            status: true,
            wajibGantiPassword: true,
            desaId: true,
            desa: {
              select: {
                id: true,
                namaDesa: true,
                slug: true,
                kodeDesa: true,
                kecamatan: true,
                kabupaten: true,
                provinsi: true,
              },
            },
          },
        },
      },
    });

    if (!session || !session.isActive || new Date() > session.expiresAt) {
      // Clean up expired or invalid session
      if (session) {
        await db.session.update({
          where: { id: session.id },
          data: { isActive: false },
        });
      }
      return NextResponse.json({ authenticated: false });
    }

    // Check if user is still active/suspended
    if (session.user.status !== 'ACTIVE') {
      // Deactivate session for suspended/inactive users
      await db.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      return NextResponse.json({ authenticated: false });
    }

    // Update last activity
    await db.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    // Determine redirect path based on role
    let redirectPath = '/';
    if (session.user.role === 'SUPER_ADMIN') {
      redirectPath = '/admin';
    } else if (['ADMIN_DESA', 'OPERATOR'].includes(session.user.role)) {
      redirectPath = '/desa';
    } else if (session.user.role === 'WARGA') {
      redirectPath = '/warga';
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      session: {
        id: session.id,
        deviceInfo: session.deviceInfo,
        lastActivityAt: session.lastActivityAt,
      },
      redirectPath,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
