import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export class RedisStorage {
  // Use redis client methods instead of kv
  static async addContract(...) {
    await redis.sadd(this.CONTRACTS_SET, normalizedAddress);
    // etc.
  }
}
export interface ContractDetails {
  address: string;
  name?: string;
  addedBy?: string;
  addedAt: string;
  type: 'contract' | 'wallet';
  metadata?: any;
}

export class KVStorage {
  // Keys for Redis storage
  private static CONTRACTS_SET = 'base_art_contracts';
  private static CONTRACT_DETAILS = 'contract_details:';
  private static STATS_KEY = 'base_art_stats';

  /**
   * Add a contract to the global storage
   */
  static async addContract(
    address: string, 
    details?: Omit<ContractDetails, 'address' | 'addedAt'>
  ): Promise<{ success: boolean; isNew: boolean }> {
    try {
      const normalizedAddress = address.toLowerCase();
      
      // Check if already exists
      const exists = await kv.sismember(this.CONTRACTS_SET, normalizedAddress);
      
      if (!exists) {
        // Add to the set of contracts
        await kv.sadd(this.CONTRACTS_SET, normalizedAddress);
        
        // Store contract details
        const contractDetails: ContractDetails = {
          address: normalizedAddress,
          name: details?.name,
          addedBy: details?.addedBy,
          type: details?.type || 'contract',
          metadata: details?.metadata,
          addedAt: new Date().toISOString(),
        };
        
        await kv.set(
          `${this.CONTRACT_DETAILS}${normalizedAddress}`,
          JSON.stringify(contractDetails),
          {
            ex: 60 * 60 * 24 * 90, // 90 days TTL
          }
        );
        
        // Update stats
        await this.incrementStat('totalContractsAdded');
        
        console.log(`✅ Contract added to KV: ${normalizedAddress}`);
        return { success: true, isNew: true };
      }
      
      console.log(`⚠️ Contract already exists: ${normalizedAddress}`);
      return { success: true, isNew: false };
      
    } catch (error) {
      console.error('Error adding contract to KV:', error);
      throw error;
    }
  }

  /**
   * Add multiple contracts at once (for wallet imports)
   */
  static async addMultipleContracts(
    contracts: string[],
    details?: Omit<ContractDetails, 'address' | 'addedAt'>
  ): Promise<{ added: string[]; existing: string[] }> {
    const added: string[] = [];
    const existing: string[] = [];
    
    for (const address of contracts) {
      const result = await this.addContract(address, details);
      if (result.isNew) {
        added.push(address);
      } else {
        existing.push(address);
      }
    }
    
    return { added, existing };
  }

  /**
   * Get all active contracts
   */
  static async getAllContracts(): Promise<string[]> {
    try {
      const contracts = await kv.smembers(this.CONTRACTS_SET);
      console.log(`📊 Retrieved ${contracts?.length || 0} contracts from KV`);
      return contracts || [];
    } catch (error) {
      console.error('Error getting contracts from KV:', error);
      return [];
    }
  }

  /**
   * Get contract details
   */
  static async getContractDetails(address: string): Promise<ContractDetails | null> {
    try {
      const normalizedAddress = address.toLowerCase();
      const details = await kv.get(`${this.CONTRACT_DETAILS}${normalizedAddress}`);
      
      if (details) {
        return JSON.parse(details as string);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting contract details:', error);
      return null;
    }
  }

  /**
   * Get details for all contracts
   */
  static async getAllContractDetails(): Promise<ContractDetails[]> {
    try {
      const contracts = await this.getAllContracts();
      const detailsList: ContractDetails[] = [];
      
      for (const address of contracts) {
        const details = await this.getContractDetails(address);
        if (details) {
          detailsList.push(details);
        } else {
          // Create basic details for contracts without stored details
          detailsList.push({
            address,
            addedAt: new Date().toISOString(),
            type: 'contract',
          });
        }
      }
      
      // Sort by addedAt date (newest first)
      return detailsList.sort((a, b) => 
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );
      
    } catch (error) {
      console.error('Error getting all contract details:', error);
      return [];
    }
  }

  /**
   * Remove a contract
   */
  static async removeContract(address: string): Promise<boolean> {
    try {
      const normalizedAddress = address.toLowerCase();
      
      // Remove from set
      const removed = await kv.srem(this.CONTRACTS_SET, normalizedAddress);
      
      // Delete details
      await kv.del(`${this.CONTRACT_DETAILS}${normalizedAddress}`);
      
      if (removed > 0) {
        await this.incrementStat('totalContractsRemoved');
        console.log(`🗑️ Contract removed from KV: ${normalizedAddress}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error removing contract from KV:', error);
      return false;
    }
  }

  /**
   * Check if a contract exists
   */
  static async contractExists(address: string): Promise<boolean> {
    try {
      const normalizedAddress = address.toLowerCase();
      const exists = await kv.sismember(this.CONTRACTS_SET, normalizedAddress);
      return exists === 1;
    } catch (error) {
      console.error('Error checking contract existence:', error);
      return false;
    }
  }

  /**
   * Get total number of contracts
   */
  static async getContractCount(): Promise<number> {
    try {
      const count = await kv.scard(this.CONTRACTS_SET);
      return count || 0;
    } catch (error) {
      console.error('Error getting contract count:', error);
      return 0;
    }
  }

  /**
   * Update stats
   */
  private static async incrementStat(statName: string): Promise<void> {
    try {
      await kv.hincrby(this.STATS_KEY, statName, 1);
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  /**
   * Get all stats
   */
  static async getStats(): Promise<Record<string, number>> {
    try {
      const stats = await kv.hgetall(this.STATS_KEY);
      if (!stats) return {};
      
      // Convert all values to numbers
      const numberStats: Record<string, number> = {};
      for (const [key, value] of Object.entries(stats)) {
        numberStats[key] = typeof value === 'number' ? value : parseInt(String(value)) || 0;
      }
      return numberStats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return {};
    }
  }

  /**
   * Clear all contracts (admin function - use with caution!)
   */
  static async clearAllContracts(): Promise<boolean> {
    try {
      const contracts = await this.getAllContracts();
      
      for (const address of contracts) {
        await this.removeContract(address);
      }
      
      console.log(`🧹 Cleared ${contracts.length} contracts from KV`);
      return true;
    } catch (error) {
      console.error('Error clearing all contracts:', error);
      return false;
    }
  }

  /**
   * Search contracts by name
   */
  static async searchContracts(query: string): Promise<ContractDetails[]> {
    try {
      const allDetails = await this.getAllContractDetails();
      const searchTerm = query.toLowerCase();
      
      return allDetails.filter(contract => 
        contract.name?.toLowerCase().includes(searchTerm) ||
        contract.address.includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching contracts:', error);
      return [];
    }
  }
}
