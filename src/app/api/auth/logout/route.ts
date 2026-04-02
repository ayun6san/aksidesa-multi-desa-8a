import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (sessionToken) {
      // Deactivate session
      await db.session.updateMany({
        where: { token: sessionToken },
        data: { isActive: false },
      });
    }

    // Clear cookie
    const response = NextResponse.json({ success: true, message: 'Logout berhasil' });
    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
