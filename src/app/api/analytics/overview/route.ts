import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'
    
    // Calculate date ranges
    const endDate = new Date()
    const startDate = new Date()
    const previousStartDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        previousStartDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        previousStartDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        previousStartDate.setDate(startDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
        previousStartDate.setDate(startDate.getDate() - 30)
    }

    // Get user analytics from auth.users table
    const { data: currentUsers, count: currentUserCount } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { count: previousUserCount } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact' })
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    // Calculate growth rates
    const leadGrowth = previousUserCount > 0 
      ? ((currentUserCount - previousUserCount) / previousUserCount) * 100
      : 100

    // Mock revenue data - integrate with Stripe in production
    const mockRevenue = 2847.50
    const mockPreviousRevenue = 2312.40
    const revenueGrowth = ((mockRevenue - mockPreviousRevenue) / mockPreviousRevenue) * 100

    // Mock conversion and email metrics
    const overview = {
      totalLeads: currentUserCount || 0,
      leadGrowth: Math.round(leadGrowth * 10) / 10,
      totalRevenue: mockRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      conversionRate: 8.5,
      conversionGrowth: 12.3,
      emailOpenRate: 24.8,
      emailGrowth: 18.7
    }

    return NextResponse.json({
      success: true,
      overview
    })

  } catch (error) {
    console.error('Analytics overview API failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics overview'
    }, { status: 500 })
  }
}