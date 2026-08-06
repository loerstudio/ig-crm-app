import { storage } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leads: Array<{ brand_name: string; instagram_username: string; website: string | null }> = body.leads;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    const added = [];
    for (const lead of leads) {
      if (lead.brand_name && lead.instagram_username) {
        const newLead = await storage.addLead({
          brand_name: lead.brand_name,
          instagram_username: lead.instagram_username,
          website: lead.website || null,
          status: 'TO_CONTACT',
        });
        added.push(newLead);
      }
    }

    return NextResponse.json({ added: added.length, leads: added });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
