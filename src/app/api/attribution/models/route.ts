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
    const model = searchParams.get('model') || 'all'

    // Mock attribution data with multiple models
    const attributionModels = {
      'first_touch': {
        name: 'First Touch',
        description: 'Credits the first interaction in the customer journey',
        totalRevenue: 2847.50,
        channels: [
          { channel: 'Organic Search', revenue: 1139.00, percentage: 40.0, conversions: 23 },
          { channel: 'Direct', revenue: 854.25, percentage: 30.0, conversions: 17 },
          { channel: 'Social Media', revenue: 569.50, percentage: 20.0, conversions: 12 },
          { channel: 'Email', revenue: 227.80, percentage: 8.0, conversions: 5 },
          { channel: 'Referral', revenue: 56.95, percentage: 2.0, conversions: 1 }
        ]
      },
      'last_touch': {
        name: 'Last Touch',
        description: 'Credits the last interaction before conversion',
        totalRevenue: 2847.50,
        channels: [
          { channel: 'Direct', revenue: 1423.75, percentage: 50.0, conversions: 29 },
          { channel: 'Email', revenue: 854.25, percentage: 30.0, conversions: 17 },
          { channel: 'Organic Search', revenue: 427.13, percentage: 15.0, conversions: 9 },
          { channel: 'Social Media', revenue: 113.90, percentage: 4.0, conversions: 2 },
          { channel: 'Referral', revenue: 28.48, percentage: 1.0, conversions: 1 }
        ]
      },
      'linear': {
        name: 'Linear Attribution',
        description: 'Distributes credit equally across all touchpoints',
        totalRevenue: 2847.50,
        channels: [
          { channel: 'Organic Search', revenue: 996.63, percentage: 35.0, conversions: 20 },
          { channel: 'Direct', revenue: 825.18, percentage: 29.0, conversions: 17 },
          { channel: 'Email', revenue: 569.50, percentage: 20.0, conversions: 12 },
          { channel: 'Social Media', revenue: 341.70, percentage: 12.0, conversions: 7 },
          { channel: 'Referral', revenue: 113.90, percentage: 4.0, conversions: 2 }
        ]
      },
      'time_decay': {
        name: 'Time Decay',
        description: 'Gives more credit to interactions closer to conversion',
        totalRevenue: 2847.50,
        channels: [
          { channel: 'Direct', revenue: 1196.35, percentage: 42.0, conversions: 24 },
          { channel: 'Email', revenue: 739.95, percentage: 26.0, conversions: 15 },
          { channel: 'Organic Search', revenue: 569.50, percentage: 20.0, conversions: 12 },
          { channel: 'Social Media', revenue: 256.28, percentage: 9.0, conversions: 5 },
          { channel: 'Referral', revenue: 85.43, percentage: 3.0, conversions: 2 }
        ]
      },
      'position_based': {
        name: 'Position Based (40-20-40)',
        description: '40% first touch, 40% last touch, 20% distributed equally',
        totalRevenue: 2847.50,
        channels: [
          { channel: 'Organic Search', revenue: 996.63, percentage: 35.0, conversions: 20 },
          { channel: 'Direct', revenue: 882.33, percentage: 31.0, conversions: 18 },
          { channel: 'Email', revenue: 540.23, percentage: 19.0, conversions: 11 },
          { channel: 'Social Media', revenue: 313.23, percentage: 11.0, conversions: 6 },
          { channel: 'Referral', revenue: 113.90, percentage: 4.0, conversions: 3 }
        ]
      }
    }

    // Mock customer journey data
    const customerJourneys = [
      {
        customerId: 'cust_001',
        email: 'sarah.j@example.com',
        conversionValue: 49.99,
        conversionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        touchpoints: [
          { channel: 'Organic Search', source: 'google', timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'resume-keywords' },
          { channel: 'Social Media', source: 'reddit', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'ats-success-story' },
          { channel: 'Email', source: 'welcome-sequence', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'step-2-tips' },
          { channel: 'Direct', source: 'direct', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'conversion' }
        ]
      },
      {
        customerId: 'cust_002',
        email: 'mike.c@example.com',
        conversionValue: 29.99,
        conversionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        touchpoints: [
          { channel: 'Social Media', source: 'linkedin', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'ats-truth' },
          { channel: 'Direct', source: 'direct', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'conversion' }
        ]
      },
      {
        customerId: 'cust_003',
        email: 'jennifer.d@example.com',
        conversionValue: 49.99,
        conversionDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        touchpoints: [
          { channel: 'Organic Search', source: 'google', timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'resume-templates' },
          { channel: 'Email', source: 'abandoned-cart', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'step-1-reminder' },
          { channel: 'Email', source: 'abandoned-cart', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), campaign: 'step-2-offer' },
          { channel: 'Direct', source: 'direct', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), campaign: 'conversion' }
        ]
      }
    ]

    // Channel performance comparison
    const channelComparison = {
      'Organic Search': {
        firstTouch: 1139.00,
        lastTouch: 427.13,
        linear: 996.63,
        timeDecay: 569.50,
        positionBased: 996.63
      },
      'Direct': {
        firstTouch: 854.25,
        lastTouch: 1423.75,
        linear: 825.18,
        timeDecay: 1196.35,
        positionBased: 882.33
      },
      'Email': {
        firstTouch: 227.80,
        lastTouch: 854.25,
        linear: 569.50,
        timeDecay: 739.95,
        positionBased: 540.23
      },
      'Social Media': {
        firstTouch: 569.50,
        lastTouch: 113.90,
        linear: 341.70,
        timeDecay: 256.28,
        positionBased: 313.23
      },
      'Referral': {
        firstTouch: 56.95,
        lastTouch: 28.48,
        linear: 113.90,
        timeDecay: 85.43,
        positionBased: 113.90
      }
    }

    // Return specific model or all models
    const response = model === 'all' 
      ? { models: attributionModels, customerJourneys, channelComparison }
      : { model: attributionModels[model], customerJourneys, channelComparison }

    return NextResponse.json({
      success: true,
      attribution: response,
      timeRange
    })

  } catch (error) {
    console.error('Attribution API failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch attribution data'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, modelSettings } = body

    if (action === 'update_model_settings') {
      // Update attribution model settings
      return NextResponse.json({
        success: true,
        message: 'Attribution model settings updated successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Attribution action failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action'
    }, { status: 500 })
  }
}