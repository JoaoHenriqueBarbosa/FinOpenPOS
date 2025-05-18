// FULL COPY-PASTE: No changes needed!
//
// For Next.js 13+ (app directory):
// File: app/api/admin/expenses/total/route.ts
//
// For Next.js 12 (pages directory):
// File: pages/api/admin/expenses/total.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Hardcoded for your project, as requested
const supabaseUrl = "https://dmycnpbpnitgcbufasqm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWNucGJwbml0Z2NidWZhc3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTI1NzUsImV4cCI6MjA2MzA4ODU3NX0.kI86bL1hNfwClW_Wdi1vNp5GGx1z_5EgH135E4SmqK4";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .not('amount', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Always works, even with empty or null rows
    const total = (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return NextResponse.json({ total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

// If using "pages" directory, change the export to default:
//
// export default async function handler(req, res) { ... }
