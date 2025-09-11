import { NextRequest, NextResponse } from 'next/server'
import { 
  getPOATemplates,
  createPOATemplate
} from '@/lib/events'

// GET /api/poa/templates - Get POA templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorAddress = searchParams.get('creator')
    const category = searchParams.get('category')
    const publicOnly = searchParams.get('public') === 'true'

    const templates = await getPOATemplates(
      creatorAddress || undefined,
      category || undefined,
      publicOnly
    )

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching POA templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch POA templates' },
      { status: 500 }
    )
  }
}

// POST /api/poa/templates - Create a new POA template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.creatorAddress || !body.name) {
      return NextResponse.json(
        { error: 'creatorAddress and name are required' },
        { status: 400 }
      )
    }

    // Set defaults for optional fields
    const templateData = {
      creatorAddress: body.creatorAddress,
      name: body.name,
      description: body.description || '',
      category: body.category || 'general',
      templateImageUrl: body.templateImageUrl,
      templateMetadata: body.templateMetadata,
      backgroundColor: body.backgroundColor || '#ffffff',
      textColor: body.textColor || '#000000',
      accentColor: body.accentColor || '#3b82f6',
      isPublic: body.isPublic || false,
    }

    const template = await createPOATemplate(templateData)
    return NextResponse.json(template)

  } catch (error) {
    console.error('Error creating POA template:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create POA template'
      },
      { status: 500 }
    )
  }
}
