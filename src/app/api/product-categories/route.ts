// app/api/product-categories/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const onlyActive = url.searchParams.get('onlyActive') === 'true';
    const search = url.searchParams.get('q')?.trim();

    const categories = await repos.productCategories.findAll({
      onlyActive,
    });

    return NextResponse.json(categories);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /product-categories error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const repos = await createRepositories();
    const body = await request.json();
    const name = String(body.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const category = await repos.productCategories.create({
      name,
      description: body.description ?? null,
      color: body.color ?? null,
      is_active: body.is_active ?? true,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /product-categories error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
