import { NextResponse } from 'next/server';

// 🔥 URL del backend desde variable de entorno
// Nota: se usa NEXT_PUBLIC_API_URL porque este endpoint corre en el server
// de Next.js, donde la variable ya está disponible y apunta al backend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // El servidor de Next.js se conecta al backend por dentro de la MV
    const backendRes = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en API Proxy de Next.js:', error);
    return NextResponse.json({ message: 'Error interno de comunicación con el backend' }, { status: 500 });
  }
}