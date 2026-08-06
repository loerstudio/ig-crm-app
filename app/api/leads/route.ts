import { storage } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const leads = storage.getLeads().sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const newLead = storage.addLead({
    brand_name: body.brand_name,
    instagram_username: body.instagram_username,
    website: body.website || null,
    status: body.status || 'TO_CONTACT',
  });
  return NextResponse.json(newLead);
}
