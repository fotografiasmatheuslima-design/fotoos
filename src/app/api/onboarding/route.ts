import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { organizations, profiles } from '@/lib/db/schema'

// Cria org + profile ao registrar novo usuario
export async function POST(req: NextRequest) {
  try {
    const { userId, name, studio, email } = await req.json()

    if (!userId || !name || !studio || !email) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Gera slug unico a partir do nome do estudio
    const baseSlug = studio
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const slug = `${baseSlug}-${Date.now().toString(36)}`

    // Cria organizacao
    const [org] = await db.insert(organizations).values({
      name: studio,
      slug,
      ownerEmail: email,
      plan: 'trial',
    }).returning()

    // Cria perfil do usuario
    await db.insert(profiles).values({
      id: userId,
      orgId: org.id,
      fullName: name,
      role: 'owner',
    })

    return NextResponse.json({ orgId: org.id })
  } catch (err) {
    console.error('[onboarding]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
