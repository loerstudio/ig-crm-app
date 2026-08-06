import { storage } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const leads = await storage.getLeads();
    return NextResponse.json(leads);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newLead = await storage.addLead({
      brand_name: body.brand_name,
      instagram_username: body.instagram_username,
      website: body.website || null,
      status: body.status || 'TO_CONTACT',
    });
    return NextResponse.json(newLead);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
