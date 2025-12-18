// app/api/payment-methods/route.ts
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';
import type { PaymentScope } from '@/models/db/payment-method';

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const onlyActive = url.searchParams.get('onlyActive') === 'true';
    const scopeParam = url.searchParams.get('scope');

    let scope: PaymentScope | undefined;
    if (scopeParam) {
      const scopes = scopeParam
        .split(',')
        .map((s) => s.trim().toUpperCase());
      const valid = ['BAR', 'COURT', 'BOTH'];
      const filteredScopes = scopes.filter((s) => valid.includes(s));
      // Si hay scope válido, usar el primero (el repo maneja BOTH automáticamente)
      if (filteredScopes.length > 0) {
        scope = filteredScopes[0] as PaymentScope;
      }
    }

    const paymentMethods = await repos.paymentMethods.findAll({
      scope,
      onlyActive,
    });

    return NextResponse.json(paymentMethods);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /payment-methods error:', error);
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

    if (!body.scope || !['BAR', 'COURT', 'BOTH'].includes(body.scope)) {
      return NextResponse.json({ error: 'Valid scope is required' }, { status: 400 });
    }

    const paymentMethod = await repos.paymentMethods.create({
      name,
      scope: body.scope as PaymentScope,
      is_active: body.is_active ?? true,
    });

    return NextResponse.json(paymentMethod, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /payment-methods error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
