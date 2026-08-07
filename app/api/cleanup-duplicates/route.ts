import { storage } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const leads = await storage.getLeads();

    // Group by website
    const byWebsite: Record<string, string[]> = {};
    for (const lead of leads) {
      if (lead.website) {
        const key = lead.website.toLowerCase().trim();
        if (!byWebsite[key]) byWebsite[key] = [];
        byWebsite[key].push(lead.id);
      }
    }

    // Group by instagram_username
    const byUsername: Record<string, string[]> = {};
    for (const lead of leads) {
      const key = lead.instagram_username.toLowerCase().trim();
      if (!byUsername[key]) byUsername[key] = [];
      byUsername[key].push(lead.id);
    }

    // Collect IDs to delete (keep oldest, delete newer)
    const toDelete = new Set<string>();

    // Process website duplicates
    Object.entries(byWebsite).forEach(([_website, ids]) => {
      if (ids.length > 1) {
        // Sort by creation order, keep first, delete rest
        ids.slice(1).forEach(id => toDelete.add(id));
      }
    });

    // Process username duplicates
    Object.entries(byUsername).forEach(([_username, ids]) => {
      if (ids.length > 1) {
        ids.slice(1).forEach(id => toDelete.add(id));
      }
    });

    // Delete all duplicates
    let deleted = 0;
    for (const id of toDelete) {
      try {
        await storage.deleteLead(id);
        deleted++;
      } catch (err) {
        console.error(`Failed to delete ${id}:`, err);
      }
    }

    const finalLeads = await storage.getLeads();
    return NextResponse.json({
      deleted,
      remaining: finalLeads.length,
      message: `Deleted ${deleted} duplicates. ${finalLeads.length} leads remain.`,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
