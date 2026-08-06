import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const correctPassword = process.env.NEXT_PUBLIC_CRM_PASSWORD || 'instagram2024';

  if (body.password === correctPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('crm-auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
