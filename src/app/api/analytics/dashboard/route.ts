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
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    // Get user signups over time
    const { data: dailySignups } = await supabase
      .from('auth.users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    // Process daily signups for chart
    const signupsByDate = {}
    if (dailySignups) {
      dailySignups.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0]
        signupsByDate[date] = (signupsByDate[date] || 0) + 1
      })
    }

    // Generate chart data
    const chartData = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      chartData.push({
        date: dateStr,
        signups: signupsByDate[dateStr] || 0,
        revenue: Math.floor(Math.random() * 500) + 100, // Mock revenue data
        conversions: Math.floor(Math.random() * 10) + 1
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Top traffic sources (mock data)
    const trafficSources = [
      { source: 'Organic Search', visitors: 1247, percentage: 42.1 },
      { source: 'Direct', visitors: 834, percentage: 28.2 },
      { source: 'Social Media', visitors: 456, percentage: 15.4 },
      { source: 'Email', visitors: 289, percentage: 9.8 },
      { source: 'Referral', visitors: 134, percentage: 4.5 }
    ]

    // Top pages (mock data)
    const topPages = [
      { page: '/', views: 2847, uniqueViews: 1923, bounceRate: 34.2 },
      { page: '/resume-templates', views: 1654, uniqueViews: 1234, bounceRate: 28.7 },
      { page: '/ats-optimization', views: 987, uniqueViews: 756, bounceRate: 41.3 },
      { page: '/pricing', views: 567, uniqueViews: 445, bounceRate: 52.1 },
      { page: '/articles', views: 234, uniqueViews: 189, bounceRate: 38.9 }
    ]

    // Conversion funnel (mock data)
    const conversionFunnel = [
      { stage: 'Visitors', count: 2847, percentage: 100 },
      { stage: 'File Upload', count: 1234, percentage: 43.4 },
      { stage: 'Analysis Complete', count: 987, percentage: 34.7 },
      { stage: 'Pricing Page', count: 567, percentage: 19.9 },
      { stage: 'Purchase', count: 243, percentage: 8.5 }
    ]

    return NextResponse.json({
      success: true,
      analytics: {
        chartData,
        trafficSources,
        topPages,
        conversionFunnel
      }
    })

  } catch (error) {
    console.error('Analytics dashboard API failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics dashboard'
    }, { status: 500 })
  }
}