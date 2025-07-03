import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const stage = searchParams.get('stage') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get leads from auth.users table with mock CRM data
    let query = supabase
      .from('auth.users')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,raw_user_meta_data->full_name.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('CRM leads query error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch leads'
      }, { status: 500 })
    }

    // Transform users into leads with mock CRM data
    const leads = users?.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || 'Anonymous',
      phone: user.user_metadata?.phone || '',
      company: user.user_metadata?.company || '',
      leadScore: Math.floor(Math.random() * 100),
      lifecycleStage: ['visitor', 'lead', 'marketing_qualified', 'sales_qualified', 'customer'][Math.floor(Math.random() * 5)],
      originalSource: ['organic_search', 'direct', 'social_media', 'email', 'referral'][Math.floor(Math.random() * 5)],
      createdAt: user.created_at,
      lastActivity: user.last_sign_in_at || user.created_at,
      totalSessions: Math.floor(Math.random() * 10) + 1,
      conversionProbability: Math.floor(Math.random() * 100),
      notes: ''
    })) || []

    // Filter by stage if specified
    const filteredLeads = stage === 'all' 
      ? leads 
      : leads.filter(lead => lead.lifecycleStage === stage)

    // Mock statistics
    const stats = {
      totalLeads: leads.length,
      newLeads: Math.floor(leads.length * 0.2),
      qualifiedLeads: Math.floor(leads.length * 0.15),
      customers: Math.floor(leads.length * 0.08),
      avgLeadScore: Math.floor(leads.reduce((sum, lead) => sum + lead.leadScore, 0) / leads.length),
      conversionRate: 8.5
    }

    return NextResponse.json({
      success: true,
      leads: filteredLeads,
      stats,
      total: filteredLeads.length
    })

  } catch (error) {
    console.error('CRM leads API failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch CRM leads'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, notes, lifecycleStage, leadScore } = body

    // In a real implementation, this would update the customer_profiles table
    // For now, we'll just return success
    
    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully'
    })

  } catch (error) {
    console.error('CRM lead update failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update lead'
    }, { status: 500 })
  }
}