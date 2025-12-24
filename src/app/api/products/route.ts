// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    const search = url.searchParams.get('q');
    const onlyActive = url.searchParams.get('onlyActive') === 'true';

    const products = await repos.products.findAll({
      categoryId: categoryId ? Number(categoryId) : undefined,
      search: search ?? undefined,
      onlyActive,
    });

    // Transformar ProductDB a ProductDTO con categoría normalizada
    const productsWithCategory = products.map((p: any) => ({
      ...p,
      category: Array.isArray(p.category) ? (p.category[0] || null) : (p.category || null),
    }));

    return NextResponse.json(productsWithCategory);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /products error:', error);
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

    const product = await repos.products.create({
      name: body.name,
      description: body.description ?? null,
      price: body.price,
      uses_stock: body.uses_stock ?? true,
      min_stock: body.min_stock ?? 0,
      category_id: body.category_id ?? null,
      is_active: body.is_active ?? true,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /products error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
