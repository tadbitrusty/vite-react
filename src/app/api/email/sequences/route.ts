import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Mock email sequence data - integrate with marketing automation database
    const sequences = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Welcome Sequence',
        description: 'New user welcome and onboarding',
        triggerEvent: 'user_signup',
        status: 'active',
        enrollments: 247,
        openRate: 68.2,
        clickRate: 12.4,
        conversionRate: 8.7,
        templates: [
          { stepNumber: 1, name: 'Welcome Email', delayHours: 0, openRate: 72.1 },
          { stepNumber: 2, name: 'Getting Started Tips', delayHours: 24, openRate: 65.8 },
          { stepNumber: 3, name: 'Success Stories', delayHours: 72, openRate: 62.3 }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Upload Follow-up',
        description: 'Follow up after resume upload',
        triggerEvent: 'file_uploaded',
        status: 'active',
        enrollments: 189,
        openRate: 71.3,
        clickRate: 18.6,
        conversionRate: 14.2,
        templates: [
          { stepNumber: 1, name: 'Upload Confirmation', delayHours: 0, openRate: 78.4 },
          { stepNumber: 2, name: 'Optimization Tips', delayHours: 1, openRate: 69.7 },
          { stepNumber: 3, name: 'Premium Upgrade', delayHours: 24, openRate: 64.2 }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Purchase Thank You',
        description: 'Thank you and tips after purchase',
        triggerEvent: 'purchase_completed',
        status: 'active',
        enrollments: 87,
        openRate: 82.1,
        clickRate: 24.3,
        conversionRate: 5.8,
        templates: [
          { stepNumber: 1, name: 'Thank You', delayHours: 0, openRate: 89.2 },
          { stepNumber: 2, name: 'Next Steps Guide', delayHours: 24, openRate: 76.5 },
          { stepNumber: 3, name: 'Interview Tips', delayHours: 168, openRate: 71.8 }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Abandoned Cart',
        description: 'Reminder for incomplete purchases',
        triggerEvent: 'cart_abandoned',
        status: 'active',
        enrollments: 156,
        openRate: 45.8,
        clickRate: 15.2,
        conversionRate: 22.4,
        templates: [
          { stepNumber: 1, name: 'Complete Your Purchase', delayHours: 1, openRate: 52.3 },
          { stepNumber: 2, name: 'Limited Time Offer', delayHours: 24, openRate: 41.7 },
          { stepNumber: 3, name: 'Final Reminder', delayHours: 72, openRate: 38.4 }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Re-engagement',
        description: 'Re-engage inactive users',
        triggerEvent: 'user_inactive_30_days',
        status: 'paused',
        enrollments: 94,
        openRate: 28.5,
        clickRate: 8.1,
        conversionRate: 3.2,
        templates: [
          { stepNumber: 1, name: 'We Miss You', delayHours: 0, openRate: 31.8 },
          { stepNumber: 2, name: 'Special Comeback Offer', delayHours: 72, openRate: 26.4 },
          { stepNumber: 3, name: 'Last Chance', delayHours: 168, openRate: 22.1 }
        ]
      }
    ]

    // Mock recent email activity
    const recentActivity = [
      {
        id: 1,
        sequenceName: 'Welcome Sequence',
        templateName: 'Welcome Email',
        recipientEmail: 'sarah.j@example.com',
        status: 'delivered',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        openedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        clickedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        sequenceName: 'Upload Follow-up',
        templateName: 'Upload Confirmation',
        recipientEmail: 'mike.c@example.com',
        status: 'delivered',
        sentAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        openedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        clickedAt: null
      },
      {
        id: 3,
        sequenceName: 'Abandoned Cart',
        templateName: 'Complete Your Purchase',
        recipientEmail: 'jennifer.d@example.com',
        status: 'delivered',
        sentAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        openedAt: null,
        clickedAt: null
      },
      {
        id: 4,
        sequenceName: 'Purchase Thank You',
        templateName: 'Thank You',
        recipientEmail: 'alex.p@example.com',
        status: 'delivered',
        sentAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        openedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        clickedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      }
    ]

    // Calculate overall stats
    const totalEnrollments = sequences.reduce((sum, seq) => sum + seq.enrollments, 0)
    const avgOpenRate = sequences.reduce((sum, seq) => sum + seq.openRate, 0) / sequences.length
    const avgClickRate = sequences.reduce((sum, seq) => sum + seq.clickRate, 0) / sequences.length
    const avgConversionRate = sequences.reduce((sum, seq) => sum + seq.conversionRate, 0) / sequences.length

    const stats = {
      totalSequences: sequences.length,
      activeSequences: sequences.filter(s => s.status === 'active').length,
      totalEnrollments,
      avgOpenRate: Math.round(avgOpenRate * 10) / 10,
      avgClickRate: Math.round(avgClickRate * 10) / 10,
      avgConversionRate: Math.round(avgConversionRate * 10) / 10,
      emailsSentToday: 47,
      emailsScheduled: 123
    }

    return NextResponse.json({
      success: true,
      sequences,
      recentActivity,
      stats
    })

  } catch (error) {
    console.error('Email sequences API failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch email sequences'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sequenceId, status } = body

    if (action === 'toggle_status') {
      // Toggle sequence status
      return NextResponse.json({
        success: true,
        message: `Sequence ${status === 'active' ? 'activated' : 'paused'} successfully`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Email sequence action failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action'
    }, { status: 500 })
  }
}