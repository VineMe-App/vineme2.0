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

      expect(result.referralsExists).toBe(true);
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

      expect(result.referralsExists).toBe(false);
      expect(result.generalReferralsExists).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Referrals table issue');
    });
  });

  describe('getSchemaInfo', () => {
    it('should return expected schema structure', async () => {
      const result = await ReferralDatabaseUtils.getSchemaInfo();

      expect(result.tables).toHaveLength(2);
      
      const referralsTable = result.tables.find(t => t.name === 'referrals');
      expect(referralsTable).toBeDefined();
      expect(referralsTable?.columns).toContainEqual({
        name: 'id',
        type: 'uuid',
        nullable: false,
      });
      expect(referralsTable?.columns).toContainEqual({
        name: 'group_id',
        type: 'uuid',
        nullable: true,
      });
      expect(referralsTable?.columns).toContainEqual({
        name: 'referred_user_id',
        type: 'uuid',
        nullable: false,
      });
      expect(referralsTable?.columns).toContainEqual({
        name: 'church_id',
        type: 'uuid',
        nullable: true,
      });
      expect(referralsTable?.columns).toContainEqual({
        name: 'status',
        type: 'text',
        nullable: false,
      });

      const generalReferralsTable = result.tables.find(t => t.name === 'general_referrals');
      expect(generalReferralsTable).toBeDefined();
      expect(generalReferralsTable?.columns).toContainEqual({
        name: 'referred_by_user_id',
        type: 'uuid',
        nullable: false,
      });
      expect(generalReferralsTable?.columns).toContainEqual({
        name: 'referred_user_id',
        type: 'uuid',
        nullable: false,
      });
    });
  });

  describe('performMaintenance', () => {
    it('should check for orphaned records', async () => {
      // Mock orphaned records query
      const mockLimit = jest.fn().mockResolvedValue({
        data: [{ id: 'orphaned-1' }, { id: 'orphaned-2' }],
        error: null,
      });
      const mockSecondNot = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFirstNot = jest.fn().mockReturnValue({ not: mockSecondNot });
      const mockSelect = jest.fn().mockReturnValue({ not: mockFirstNot });

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
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });
      const mockSecondNot = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFirstNot = jest.fn().mockReturnValue({ not: mockSecondNot });
      const mockSelect = jest.fn().mockReturnValue({ not: mockFirstNot });

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
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('CREATE TABLE IF NOT EXISTS referrals');
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('group_id UUID REFERENCES groups(id) ON DELETE SET NULL');
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('referred_by_user_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('referred_user_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('church_id UUID REFERENCES churches(id) ON DELETE SET NULL');
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain("status TEXT NOT NULL DEFAULT 'pending'");
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('CHECK (referred_by_user_id != referred_user_id)');

    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('CREATE TABLE IF NOT EXISTS general_referrals');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('referred_by_user_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('referred_user_id UUID NOT NULL REFERENCES users(id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain("status TEXT NOT NULL DEFAULT 'pending'");
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('CHECK (referred_by_user_id != referred_user_id)');

    expect(REFERRAL_SCHEMA_SQL.INDEXES).toContain('CREATE INDEX IF NOT EXISTS idx_referrals_group_id');
    expect(REFERRAL_SCHEMA_SQL.INDEXES).toContain('CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id');
    expect(REFERRAL_SCHEMA_SQL.INDEXES).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_referral');
    expect(REFERRAL_SCHEMA_SQL.INDEXES).toContain('CREATE INDEX IF NOT EXISTS idx_general_referrals_referred_user_id');

    expect(REFERRAL_SCHEMA_SQL.RLS_POLICIES).toContain('ALTER TABLE referrals ENABLE ROW LEVEL SECURITY');
    expect(REFERRAL_SCHEMA_SQL.RLS_POLICIES).toContain('ALTER TABLE general_referrals ENABLE ROW LEVEL SECURITY');

    expect(REFERRAL_SCHEMA_SQL.TRIGGERS).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
    expect(REFERRAL_SCHEMA_SQL.TRIGGERS).toContain('CREATE TRIGGER update_referrals_updated_at');
  });

  it('should have proper foreign key constraints', () => {
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('REFERENCES groups(id) ON DELETE CASCADE');
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('REFERENCES users(id) ON DELETE CASCADE');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('REFERENCES users(id) ON DELETE CASCADE');
  });

  it('should have proper unique constraints', () => {
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('UNIQUE(referred_by_user_id, referred_user_id, group_id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('UNIQUE(referred_by_user_id, referred_user_id)');
  });

  it('should have proper check constraints', () => {
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('CHECK (referred_by_user_id != referred_user_id)');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('CHECK (referred_by_user_id != referred_user_id)');
  });

  it('should have proper timestamp fields', () => {
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    expect(REFERRAL_SCHEMA_SQL.REFERRALS_TABLE).toContain('updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    expect(REFERRAL_SCHEMA_SQL.GENERAL_REFERRALS_TABLE).toContain('updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
  });
});