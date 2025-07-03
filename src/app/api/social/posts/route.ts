import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Mock social media posts data
    const posts = [
      {
        id: 1,
        platform: 'reddit',
        title: 'How I Increased My Interview Rate by 300% with ATS Optimization',
        content: 'After struggling for months with zero interview callbacks, I discovered ResumeVita and everything changed...',
        url: 'https://www.resumevita.io?utm_source=reddit&utm_campaign=success_story',
        status: 'posted',
        scheduledFor: null,
        postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        subreddit: 'r/jobs',
        upvotes: 847,
        comments: 156,
        views: 12400,
        clicks: 234,
        shares: 89
      },
      {
        id: 2,
        platform: 'reddit',
        title: 'Free ATS Resume Checker - Actually Works!',
        content: 'Found this free tool that checks if your resume will pass ATS systems. Game changer for job hunting...',
        url: 'https://www.resumevita.io?utm_source=reddit&utm_campaign=free_tool',
        status: 'posted',
        scheduledFor: null,
        postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        subreddit: 'r/careerguidance',
        upvotes: 423,
        comments: 87,
        views: 8900,
        clicks: 167,
        shares: 34
      },
      {
        id: 3,
        platform: 'linkedin',
        title: 'The Hidden Truth About ATS Systems',
        content: '95% of large companies use ATS to filter resumes. Here\'s how to beat them...',
        url: 'https://www.resumevita.io?utm_source=linkedin&utm_campaign=ats_truth',
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        postedAt: null,
        subreddit: null,
        upvotes: 0,
        comments: 0,
        views: 0,
        clicks: 0,
        shares: 0
      },
      {
        id: 4,
        platform: 'reddit',
        title: 'Resume Templates That Actually Get You Hired',
        content: 'Tested 50+ resume templates. These are the only ones that consistently get interviews...',
        url: 'https://www.resumevita.io/templates?utm_source=reddit&utm_campaign=templates',
        status: 'posted',
        scheduledFor: null,
        postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        subreddit: 'r/resumes',
        upvotes: 1204,
        comments: 298,
        views: 18700,
        clicks: 412,
        shares: 156
      },
      {
        id: 5,
        platform: 'linkedin',
        title: 'Why Your Resume Gets Rejected in 6 Seconds',
        content: 'Recruiters spend an average of 6 seconds scanning your resume. Here\'s what they\'re looking for...',
        url: 'https://www.resumevita.io?utm_source=linkedin&utm_campaign=6_seconds',
        status: 'draft',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        postedAt: null,
        subreddit: null,
        upvotes: 0,
        comments: 0,
        views: 0,
        clicks: 0,
        shares: 0
      }
    ]

    // Mock viral content detection
    const viralPosts = posts.filter(post => 
      post.status === 'posted' && (post.upvotes > 500 || post.views > 10000)
    )

    // Calculate platform stats
    const platformStats = {
      reddit: {
        totalPosts: posts.filter(p => p.platform === 'reddit').length,
        activePosts: posts.filter(p => p.platform === 'reddit' && p.status === 'posted').length,
        totalUpvotes: posts.filter(p => p.platform === 'reddit').reduce((sum, p) => sum + p.upvotes, 0),
        totalViews: posts.filter(p => p.platform === 'reddit').reduce((sum, p) => sum + p.views, 0),
        totalClicks: posts.filter(p => p.platform === 'reddit').reduce((sum, p) => sum + p.clicks, 0),
        avgEngagement: 12.8
      },
      linkedin: {
        totalPosts: posts.filter(p => p.platform === 'linkedin').length,
        activePosts: posts.filter(p => p.platform === 'linkedin' && p.status === 'posted').length,
        totalUpvotes: posts.filter(p => p.platform === 'linkedin').reduce((sum, p) => sum + p.upvotes, 0),
        totalViews: posts.filter(p => p.platform === 'linkedin').reduce((sum, p) => sum + p.views, 0),
        totalClicks: posts.filter(p => p.platform === 'linkedin').reduce((sum, p) => sum + p.clicks, 0),
        avgEngagement: 8.4
      }
    }

    // Overall stats
    const stats = {
      totalPosts: posts.length,
      activePosts: posts.filter(p => p.status === 'posted').length,
      scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
      draftPosts: posts.filter(p => p.status === 'draft').length,
      viralPosts: viralPosts.length,
      totalViews: posts.reduce((sum, p) => sum + p.views, 0),
      totalClicks: posts.reduce((sum, p) => sum + p.clicks, 0),
      clickThroughRate: posts.reduce((sum, p) => sum + p.views, 0) > 0 
        ? (posts.reduce((sum, p) => sum + p.clicks, 0) / posts.reduce((sum, p) => sum + p.views, 0) * 100).toFixed(2)
        : 0,
      avgEngagement: 10.6
    }

    return NextResponse.json({
      success: true,
      posts,
      viralPosts,
      platformStats,
      stats
    })

  } catch (error) {
    console.error('Social posts API failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch social media posts'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, postId, title, content, platform, scheduledFor } = body

    if (action === 'create_post') {
      // Create new social media post
      return NextResponse.json({
        success: true,
        message: 'Post created successfully',
        postId: Date.now()
      })
    }

    if (action === 'schedule_post') {
      // Schedule a post
      return NextResponse.json({
        success: true,
        message: 'Post scheduled successfully'
      })
    }

    if (action === 'delete_post') {
      // Delete a post
      return NextResponse.json({
        success: true,
        message: 'Post deleted successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Social post action failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action'
    }, { status: 500 })
  }
}