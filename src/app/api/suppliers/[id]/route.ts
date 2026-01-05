// app/api/suppliers/[id]/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string } };

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const supplierId = Number(params.id);
    
    if (Number.isNaN(supplierId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const supplier = await repos.suppliers.update(supplierId, {
      name: body.name,
      contact_email: body.contact_email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      status: body.status ?? "active",
    });

    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PUT /suppliers/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const supplierId = Number(params.id);
    
    if (Number.isNaN(supplierId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await repos.suppliers.delete(supplierId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /suppliers/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
