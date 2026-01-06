// app/api/products/route.ts
export const dynamic = 'force-dynamic'
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.error('GET /products error:', error);
    
    let errorMessage = 'Error al cargar los productos';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
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
    
    // Manejar errores específicos de PostgreSQL
    let errorMessage = 'Error al crear el producto';
    if (error instanceof Error) {
      if (error.message.includes('duplicate key value violates unique constraint')) {
        errorMessage = 'Error: Ya existe un producto con ese ID. Por favor, contactá al administrador del sistema.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
