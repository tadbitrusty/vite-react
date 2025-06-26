import { CachedService } from '../middleware/cache-middleware';
import { CacheKeys, CacheTTL } from '../lib/cache';
import { TRPCError } from '@trpc/server';

export interface Template {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  isFree: boolean;
  stripeProductId?: string;
  previewImage?: string;
  category: string;
  features: string[];
  popularity: number;
}

export class CachedTemplateService extends CachedService {
  private templates: Template[] = [
    {
      id: 'ats-optimized',
      name: 'ATS Optimized',
      description: 'Clean, professional template optimized for Applicant Tracking Systems',
      price: 0,
      icon: '📄',
      isFree: true,
      category: 'Professional',
      features: ['ATS Friendly', 'Clean Layout', 'Easy to Read'],
      popularity: 95,
    },
    {
      id: 'entry-clean',
      name: 'Entry Clean',
      description: 'Perfect for entry-level positions with a modern, clean design',
      price: 599, // $5.99
      icon: '🌟',
      isFree: false,
      stripeProductId: 'prod_entry_clean',
      category: 'Entry Level',
      features: ['Modern Design', 'Entry Level Focused', 'Professional'],
      popularity: 85,
    },
    {
      id: 'tech-focus',
      name: 'Tech Focus',
      description: 'Designed specifically for software engineers and tech professionals',
      price: 999, // $9.99
      icon: '💻',
      isFree: false,
      stripeProductId: 'prod_tech_focus',
      category: 'Technology',
      features: ['Tech Optimized', 'Skills Highlight', 'Project Showcase'],
      popularity: 92,
    },
    {
      id: 'professional-plus',
      name: 'Professional Plus',
      description: 'Premium template for mid-level to senior professionals',
      price: 799, // $7.99
      icon: '👔',
      isFree: false,
      stripeProductId: 'prod_professional_plus',
      category: 'Professional',
      features: ['Premium Design', 'Executive Style', 'Achievement Focus'],
      popularity: 88,
    },
    {
      id: 'executive-format',
      name: 'Executive Format',
      description: 'Executive-level template for C-suite and senior leadership roles',
      price: 1299, // $12.99
      icon: '🏆',
      isFree: false,
      stripeProductId: 'prod_executive_format',
      category: 'Executive',
      features: ['Executive Level', 'Leadership Focus', 'Premium Layout'],
      popularity: 78,
    },
  ];

  async getTemplates(): Promise<Template[]> {
    try {
      // Try cache first
      const cached = await this.cacheGet<Template[]>(CacheKeys.templates());
      if (cached && cached.length > 0) {
        return cached;
      }

      // Return static templates (in a real app, this might come from database)
      const templates = this.templates.sort((a, b) => b.popularity - a.popularity);

      // Cache the templates
      await this.cacheSet(CacheKeys.templates(), templates, CacheTTL.VERY_LONG);

      // Cache individual templates
      const cachePromises = templates.map(template =>
        this.cacheSet(CacheKeys.template(template.id), template, CacheTTL.VERY_LONG)
      );
      await Promise.all(cachePromises);

      return templates;
    } catch (error) {
      console.error('Get templates error:', error);
      // Fallback to static data
      return this.templates.sort((a, b) => b.popularity - a.popularity);
    }
  }

  async getTemplateById(id: string): Promise<Template | null> {
    try {
      // Try cache first
      const cached = await this.cacheGet<Template>(CacheKeys.template(id));
      if (cached) {
        return cached;
      }

      // Find in static data
      const template = this.templates.find(t => t.id === id) || null;

      // Cache if found
      if (template) {
        await this.cacheSet(CacheKeys.template(id), template, CacheTTL.VERY_LONG);
      }

      return template;
    } catch (error) {
      console.error('Get template by ID error:', error);
      // Fallback to static data
      return this.templates.find(t => t.id === id) || null;
    }
  }

  async getFreeTemplates(): Promise<Template[]> {
    try {
      const cacheKey = 'templates:free';
      const cached = await this.cacheGet<Template[]>(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }

      const allTemplates = await this.getTemplates();
      const freeTemplates = allTemplates.filter(t => t.isFree);

      await this.cacheSet(cacheKey, freeTemplates, CacheTTL.VERY_LONG);
      return freeTemplates;
    } catch (error) {
      console.error('Get free templates error:', error);
      return this.templates.filter(t => t.isFree);
    }
  }

  async getPremiumTemplates(): Promise<Template[]> {
    try {
      const cacheKey = 'templates:premium';
      const cached = await this.cacheGet<Template[]>(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }

      const allTemplates = await this.getTemplates();
      const premiumTemplates = allTemplates.filter(t => !t.isFree);

      await this.cacheSet(cacheKey, premiumTemplates, CacheTTL.VERY_LONG);
      return premiumTemplates;
    } catch (error) {
      console.error('Get premium templates error:', error);
      return this.templates.filter(t => !t.isFree);
    }
  }

  async getTemplatesByCategory(category: string): Promise<Template[]> {
    try {
      const cacheKey = `templates:category:${category}`;
      const cached = await this.cacheGet<Template[]>(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }

      const allTemplates = await this.getTemplates();
      const categoryTemplates = allTemplates.filter(
        t => t.category.toLowerCase() === category.toLowerCase()
      );

      await this.cacheSet(cacheKey, categoryTemplates, CacheTTL.VERY_LONG);
      return categoryTemplates;
    } catch (error) {
      console.error('Get templates by category error:', error);
      return this.templates.filter(
        t => t.category.toLowerCase() === category.toLowerCase()
      );
    }
  }

  async getPopularTemplates(limit: number = 5): Promise<Template[]> {
    try {
      const cacheKey = `templates:popular:${limit}`;
      const cached = await this.cacheGet<Template[]>(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }

      const allTemplates = await this.getTemplates();
      const popularTemplates = allTemplates
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit);

      await this.cacheSet(cacheKey, popularTemplates, CacheTTL.LONG);
      return popularTemplates;
    } catch (error) {
      console.error('Get popular templates error:', error);
      return this.templates
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit);
    }
  }

  async searchTemplates(query: string): Promise<Template[]> {
    try {
      const allTemplates = await this.getTemplates();
      const searchResults = allTemplates.filter(template =>
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.description.toLowerCase().includes(query.toLowerCase()) ||
        template.category.toLowerCase().includes(query.toLowerCase()) ||
        template.features.some(feature => 
          feature.toLowerCase().includes(query.toLowerCase())
        )
      );

      return searchResults.sort((a, b) => b.popularity - a.popularity);
    } catch (error) {
      console.error('Search templates error:', error);
      return [];
    }
  }

  async getTemplateStats(templateId: string): Promise<{
    totalUsage: number;
    recentUsage: number;
    rating?: number;
    revenue: number;
  }> {
    try {
      const cacheKey = `template_stats:${templateId}`;
      const cached = await this.cacheGet<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // In a real application, these would come from database queries
      // For now, we'll return mock data based on popularity
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      const mockStats = {
        totalUsage: Math.floor(template.popularity * 100),
        recentUsage: Math.floor(template.popularity * 10),
        rating: template.popularity / 20, // Convert to 5-star rating
        revenue: template.isFree ? 0 : Math.floor(template.popularity * template.price / 10),
      };

      await this.cacheSet(cacheKey, mockStats, CacheTTL.SHORT);
      return mockStats;
    } catch (error) {
      console.error('Get template stats error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get template statistics',
      });
    }
  }

  async updateTemplatePopularity(templateId: string): Promise<void> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) return;

      // Increment popularity (in a real app, this would update the database)
      template.popularity = Math.min(100, template.popularity + 1);

      // Update cache
      await this.cacheSet(CacheKeys.template(templateId), template, CacheTTL.VERY_LONG);

      // Invalidate related caches
      await this.invalidateTemplateCaches();
    } catch (error) {
      console.error('Update template popularity error:', error);
    }
  }

  async validateTemplateId(templateId: string): Promise<boolean> {
    try {
      const template = await this.getTemplateById(templateId);
      return !!template;
    } catch (error) {
      console.error('Validate template ID error:', error);
      return false;
    }
  }

  async getTemplatePrice(templateId: string): Promise<number | null> {
    try {
      const template = await this.getTemplateById(templateId);
      return template?.price || null;
    } catch (error) {
      console.error('Get template price error:', error);
      return null;
    }
  }

  async isTemplateFree(templateId: string): Promise<boolean> {
    try {
      const template = await this.getTemplateById(templateId);
      return template?.isFree || false;
    } catch (error) {
      console.error('Check template free error:', error);
      return false;
    }
  }

  async getTemplateCategories(): Promise<string[]> {
    try {
      const cacheKey = 'template_categories';
      const cached = await this.cacheGet<string[]>(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }

      const allTemplates = await this.getTemplates();
      const categories = [...new Set(allTemplates.map(t => t.category))].sort();

      await this.cacheSet(cacheKey, categories, CacheTTL.VERY_LONG);
      return categories;
    } catch (error) {
      console.error('Get template categories error:', error);
      return [];
    }
  }

  async invalidateTemplateCaches(): Promise<void> {
    try {
      await Promise.all([
        this.cacheDel(CacheKeys.templates()),
        this.cacheDel('templates:free'),
        this.cacheDel('templates:premium'),
        this.cacheDel('template_categories'),
        this.invalidatePattern('templates:category:*'),
        this.invalidatePattern('templates:popular:*'),
        this.invalidatePattern('template_stats:*'),
      ]);
    } catch (error) {
      console.error('Invalidate template caches error:', error);
    }
  }
}

export const cachedTemplateService = new CachedTemplateService();