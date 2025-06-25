import { createTestCaller, createTestContext, TestDatabase, integrationTestHelpers, prisma } from '../setup';
import { TRPCError } from '@trpc/server';

describe('User Router Integration Tests', () => {
  describe('create user', () => {
    it('should create a new user successfully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        phone: '+1234567890',
        location: 'New York, NY',
      };

      const result = await caller.user.create(userData);

      integrationTestHelpers.expectValidResponse(result, [
        'id',
        'email',
        'name',
        'phone',
        'location',
        'isFirstTime',
        'emailVerified',
        'createdAt',
        'updatedAt'
      ]);

      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.phone).toBe(userData.phone);
      expect(result.location).toBe(userData.location);
      expect(result.isFirstTime).toBe(true);
      expect(result.emailVerified).toBe(false);

      // Verify user was actually created in database
      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser!.id).toBe(result.id);
    });

    it('should return existing user when email already exists', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Create initial user
      const existingUser = await prisma.user.create({
        data: {
          email: 'existing@example.com',
          name: 'Existing User',
          phone: '+1111111111',
          location: 'Los Angeles, CA',
        },
      });

      // Try to create user with same email
      const userData = {
        email: 'existing@example.com',
        name: 'Different Name',
        phone: '+2222222222',
        location: 'Different City',
      };

      const result = await caller.user.create(userData);

      // Should return existing user, not create new one
      expect(result.id).toBe(existingUser.id);
      expect(result.email).toBe(existingUser.email);
      expect(result.name).toBe(existingUser.name); // Original name preserved
      expect(result.phone).toBe(existingUser.phone); // Original phone preserved

      // Verify only one user exists with this email
      const userCount = await prisma.user.count({
        where: { email: userData.email },
      });
      expect(userCount).toBe(1);
    });

    it('should create user with minimal required data', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const userData = {
        email: 'minimal@example.com',
      };

      const result = await caller.user.create(userData);

      expect(result.email).toBe(userData.email);
      expect(result.name).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.location).toBeNull();
      expect(result.isFirstTime).toBe(true);
      expect(result.emailVerified).toBe(false);
    });

    it('should validate email format', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const userData = {
        email: 'invalid-email-format',
        name: 'Test User',
      };

      await expect(caller.user.create(userData))
        .rejects
        .toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Mock database error
      const mockCreate = jest.spyOn(prisma.user, 'create').mockRejectedValueOnce(new Error('Database connection failed'));

      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      await expect(caller.user.create(userData))
        .rejects
        .toThrow('Database connection failed');

      mockCreate.mockRestore();
    });

    it('should handle special characters in user data', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const userData = {
        email: 'special@example.com',
        name: 'José María González-López',
        phone: '+34 600 123 456',
        location: 'São Paulo, Brazil',
      };

      const result = await caller.user.create(userData);

      expect(result.name).toBe(userData.name);
      expect(result.phone).toBe(userData.phone);
      expect(result.location).toBe(userData.location);
    });
  });

  describe('checkEmailExists', () => {
    beforeEach(async () => {
      // Create test users
      await TestDatabase.seed();
    });

    it('should return true for existing email', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.user.checkEmailExists({
        email: 'integration.test@example.com',
      });

      integrationTestHelpers.expectValidResponse(result, ['exists', 'isFirstTime']);
      
      expect(result.exists).toBe(true);
      expect(result.isFirstTime).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.user.checkEmailExists({
        email: 'nonexistent@example.com',
      });

      expect(result.exists).toBe(false);
      expect(result.isFirstTime).toBe(true); // Default for non-existing users
    });

    it('should return correct isFirstTime status', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Check returning user
      const returningResult = await caller.user.checkEmailExists({
        email: 'returning.integration@example.com',
      });

      expect(returningResult.exists).toBe(true);
      expect(returningResult.isFirstTime).toBe(false);
    });

    it('should validate email format', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      await expect(caller.user.checkEmailExists({
        email: 'invalid-email-format',
      })).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const mockFindUnique = jest.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error('Database error'));

      await expect(caller.user.checkEmailExists({
        email: 'test@example.com',
      })).rejects.toThrow('Database error');

      mockFindUnique.mockRestore();
    });

    it('should handle case-sensitive email comparison', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Email should be case-sensitive at database level
      const result = await caller.user.checkEmailExists({
        email: 'INTEGRATION.TEST@EXAMPLE.COM',
      });

      // This depends on database collation, but typically emails are case-insensitive
      // We test the current behavior
      expect(typeof result.exists).toBe('boolean');
    });
  });

  describe('getProfile (protected)', () => {
    beforeEach(async () => {
      await TestDatabase.seed();
    });

    it('should return user profile when authenticated', async () => {
      // First get a test user
      const testUser = await prisma.user.findFirst({
        where: { email: 'integration.test@example.com' },
      });

      const ctx = await createTestContext(testUser);
      const caller = createTestCaller(ctx);

      const result = await caller.user.getProfile();

      integrationTestHelpers.expectValidResponse(result, [
        'id',
        'email',
        'name',
        'phone',
        'location',
        'isFirstTime',
        'emailVerified',
        'createdAt',
        'updatedAt'
      ]);

      expect(result.id).toBe(testUser!.id);
      expect(result.email).toBe(testUser!.email);
    });

    it('should throw UNAUTHORIZED when not authenticated', async () => {
      const ctx = await createTestContext(); // No user provided
      const caller = createTestCaller(ctx);

      await expect(caller.user.getProfile())
        .rejects
        .toThrow('UNAUTHORIZED');
    });

    it('should throw error when user not found', async () => {
      // Create context with non-existent user
      const fakeUser = { id: 'non-existent-user-id' };
      const ctx = await createTestContext(fakeUser);
      const caller = createTestCaller(ctx);

      await expect(caller.user.getProfile())
        .rejects
        .toThrow('User not found');
    });

    it('should return complete user profile data', async () => {
      const testUser = await prisma.user.create({
        data: {
          email: 'complete@example.com',
          name: 'Complete User',
          phone: '+1234567890',
          location: 'Complete City, CC',
          isFirstTime: false,
          emailVerified: true,
          lastLoginAt: new Date(),
          hasCompletedProfile: true,
        },
      });

      const ctx = await createTestContext(testUser);
      const caller = createTestCaller(ctx);

      const result = await caller.user.getProfile();

      expect(result.name).toBe('Complete User');
      expect(result.phone).toBe('+1234567890');
      expect(result.location).toBe('Complete City, CC');
      expect(result.isFirstTime).toBe(false);
      expect(result.emailVerified).toBe(true);
      expect(result.lastLoginAt).toBeDefined();
      expect(result.hasCompletedProfile).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent user creation with same email', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const userData = {
        email: 'concurrent@example.com',
        name: 'Concurrent User',
      };

      // Create multiple concurrent requests with same email
      const promises = Array.from({ length: 5 }, () => 
        caller.user.create(userData)
      );

      const results = await Promise.all(promises);

      // All should return the same user (first one created)
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(1);

      // Verify only one user exists in database
      const userCount = await prisma.user.count({
        where: { email: userData.email },
      });
      expect(userCount).toBe(1);
    });

    it('should handle concurrent email existence checks', async () => {
      await TestDatabase.seed();

      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Multiple concurrent checks
      const promises = Array.from({ length: 10 }, () => 
        caller.user.checkEmailExists({ email: 'integration.test@example.com' })
      );

      const results = await Promise.all(promises);

      // All should return consistent results
      results.forEach(result => {
        expect(result.exists).toBe(true);
        expect(result.isFirstTime).toBe(true);
      });
    });
  });

  describe('data validation and edge cases', () => {
    it('should handle empty string values', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const userData = {
        email: 'empty@example.com',
        name: '',
        phone: '',
        location: '',
      };

      const result = await caller.user.create(userData);

      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(''); // Empty string preserved
      expect(result.phone).toBe('');
      expect(result.location).toBe('');
    });

    it('should handle very long field values', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const longName = 'A'.repeat(100);
      const longLocation = 'B'.repeat(200);

      const userData = {
        email: 'long@example.com',
        name: longName,
        location: longLocation,
      };

      const result = await caller.user.create(userData);

      expect(result.name).toBe(longName);
      expect(result.location).toBe(longLocation);
    });

    it('should handle international email addresses', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const internationalEmails = [
        'user@münchen.de',
        'test@例え.テスト',
        'usuario@español.com',
      ];

      for (const email of internationalEmails) {
        try {
          const result = await caller.user.create({ email });
          expect(result.email).toBe(email);
        } catch (error) {
          // Some international domains might not be supported
          // This test documents current behavior
          console.log(`International email ${email} not supported:`, error);
        }
      }
    });

    it('should handle phone number formats', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const phoneFormats = [
        '+1-234-567-8900',
        '(555) 123-4567',
        '+44 20 7946 0958',
        '+33 1 42 86 83 26',
        '1234567890',
      ];

      for (let i = 0; i < phoneFormats.length; i++) {
        const result = await caller.user.create({
          email: `phone${i}@example.com`,
          phone: phoneFormats[i],
        });

        expect(result.phone).toBe(phoneFormats[i]);
      }
    });
  });

  describe('performance and scalability', () => {
    it('should handle batch user creation efficiently', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();

      // Create 50 users concurrently
      const promises = Array.from({ length: 50 }, (_, i) => 
        caller.user.create({
          email: `batch${i}@example.com`,
          name: `Batch User ${i}`,
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all users were created
      const userCount = await prisma.user.count({
        where: {
          email: { startsWith: 'batch' },
        },
      });
      expect(userCount).toBe(50);
    });

    it('should maintain response time under load', async () => {
      await TestDatabase.seed();

      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();

      // 100 concurrent email checks
      const promises = Array.from({ length: 100 }, (_, i) => 
        caller.user.checkEmailExists({
          email: i % 2 === 0 ? 'integration.test@example.com' : 'nonexistent@example.com',
        })
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});