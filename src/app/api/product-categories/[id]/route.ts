// app/api/product-categories/[id]/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const category = await repos.productCategories.findById(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /product-categories/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);
    const body = await request.json();

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const updateFields: Record<string, any> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.name = name;
    }

    if (body.description !== undefined) {
      updateFields.description = body.description ?? null;
    }

    if (body.color !== undefined) {
      updateFields.color = body.color ?? null;
    }

    if (typeof body.is_active === 'boolean') {
      updateFields.is_active = body.is_active;
    }

    if (typeof body.is_sellable === 'boolean') {
      updateFields.is_sellable = body.is_sellable;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const category = await repos.productCategories.update(id, updateFields);
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PATCH /product-categories/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await repos.productCategories.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /product-categories/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
