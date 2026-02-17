import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const artDir = path.join(process.cwd(), 'public', 'Cards', 'Art');
  try {
    const files = fs.readdirSync(artDir)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .sort()
      .map((f) => `/Cards/Art/${f}`);
    return NextResponse.json(files);
  } catch {
    return NextResponse.json([]);
  }
}
