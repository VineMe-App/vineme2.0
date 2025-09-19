import { ReferralDatabaseUtils, REFERRAL_SCHEMA_SQL } from '../referralDatabase';
import { supabase } from '../supabase';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({ data: [], error: null })),
        not: jest.fn(() => ({ data: [], error: null })),
      })),
    })),
  },
}));

describe('ReferralDatabaseUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTableStructure', () => {
    it('should validate that referral tables exist', async () => {
      // Mock successful table queries
      const mockSelect = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await ReferralDatabaseUtils.validateTableStructure();

      expect(result.groupReferralsExists).toBe(true);
      expect(result.generalReferralsExists).toBe(true);
      expect(result.indexesExist).toBe(true);
      expect(result.constraintsValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle table validation errors', async () => {
      // Mock table query errors
      const mockSelect = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Table does not exist' } 
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await ReferralDatabaseUtils.validateTableStructure();

      expect(result.groupReferralsExists).toBe(false);
      expect(result.generalReferralsExists).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Group referrals table issue');
    });
  });

  describe('getSchemaInfo', () => {
    it('should return expected schema structure', async () => {
      const result = await ReferralDatabaseUtils.getSchemaInfo();

      expect(result.tables).toHaveLength(2);
      
      const groupReferralsTable = result.tables.find(t => t.name === 'group_referrals');
      expect(groupReferralsTable).toBeDefined();
      expect(groupReferralsTable?.columns).toContainEqual({
        name: 'id',
        type: 'uuid',
        nullable: false,
      });
      expect(groupReferralsTable?.columns).toContainEqual({
        name: 'group_id',
        type: 'uuid',
        nullable: false,
      });

      const generalReferralsTable = result.tables.find(t => t.name === 'general_referrals');
      expect(generalReferralsTable).toBeDefined();
      expect(generalReferralsTable?.columns).toContainEqual({
        name: 'referrer_id',
        type: 'uuid',
        nullable: false,
      });
    });
  });

  describe('performMaintenance', () => {
    it('should check for orphaned records', async () => {
      // Mock orphaned records query
      const mockSelect = jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ 
            data: [{ id: 'orphaned-1' }, { id: 'orphaned-2' }], 
            error: null 
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await ReferralDatabaseUtils.performMaintenance();

      expect(result.orphanedRecordsFound).toBe(2);
      expect(result.vacuumCompleted).toBe(true);
      expect(result.statisticsUpdated).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle maintenance errors', async () => {
      // Mock maintenance query error
      const mockSelect = jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Query failed' } 
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await ReferralDatabaseUtils.performMaintenance();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Error checking orphaned records');
    });
  });
});

describe('REFERRAL_SCHEMA_SQL', () => {
  it('should contain all required SQL definitions', () => {
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('CREATE TABLE IF NOT EXISTS group_referrals');
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('group_id UUID NOT NULL REFERENCES groups(id)');
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('referrer_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('referred_by_user_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('CHECK (referrer_id != referred_by_user_id)');

    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('CREATE TABLE IF NOT EXISTS general_referrals');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('referrer_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('referred_by_user_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('CHECK (referrer_id != referred_by_user_id)');

    expect(REFERRAL_SCHEMA_SQL.INDEXES).toContain('CREATE INDEX IF NOT EXISTS idx_group_referrals_group_id');
    expect(REFERRAL_SCHEMA_SQL.INDEXES).toContain('CREATE INDEX IF NOT EXISTS idx_general_referrals_referrer_id');

    expect(REFERRAL_SCHEMA_SQL.RLS_POLICIES).toContain('ALTER TABLE group_referrals ENABLE ROW LEVEL SECURITY');
    expect(REFERRAL_SCHEMA_SQL.RLS_POLICIES).toContain('ALTER TABLE general_referrals ENABLE ROW LEVEL SECURITY');

    expect(REFERRAL_SCHEMA_SQL.TRIGGERS).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
    expect(REFERRAL_SCHEMA_SQL.TRIGGERS).toContain('CREATE TRIGGER update_group_referrals_updated_at');
  });

  it('should have proper foreign key constraints', () => {
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('REFERENCES groups(id) ON DELETE CASCADE');
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('REFERENCES users(id) ON DELETE CASCADE');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('REFERENCES users(id) ON DELETE CASCADE');
  });

  it('should have proper unique constraints', () => {
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('UNIQUE(group_id, referrer_id, referred_by_user_id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('UNIQUE(referrer_id, referred_by_user_id)');
  });

  it('should have proper check constraints', () => {
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('CHECK (referrer_id != referred_by_user_id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('CHECK (referrer_id != referred_by_user_id)');
  });

  it('should have proper timestamp fields', () => {
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    expect(REFERRAL_SCHEMA_SQL.GROUP_REFERRALS_TABLE).toContain('updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
  });
});