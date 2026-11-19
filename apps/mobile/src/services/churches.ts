import { supabase } from './supabase';
import type { Church, Service } from '../types/database';

export class ChurchService {
  /**
   * Get all churches for selection
   */
  async getChurches(): Promise<{ data: Church[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .order('name');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch churches'),
      };
    }
  }

  /**
   * Get church by ID
   */
  async getChurchById(
    id: string
  ): Promise<{ data: Church | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to fetch church'),
      };
    }
  }

  /**
   * Get services for a church
   */
  async getServicesByChurch(
    churchId: string
  ): Promise<{ data: Service[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('church_id', churchId)
        .order('name');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch services'),
      };
    }
  }
}

// Export singleton instance
export const churchService = new ChurchService();
