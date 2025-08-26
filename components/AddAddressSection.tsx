// components/AddAddressSection.tsx - With Vercel KV integration
'use client';

import { useState, useEffect } from 'react';

interface AddAddressSectionProps {
  onAddressAdded: () => void;
}

interface ContractDetails {
  address: string;
  name?: string;
  addedBy?: string;
  addedAt: string;
  type: 'contract' | 'wallet';
}

export default function AddAddressSection({ onAddressAdded }: AddAddressSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [addressType, setAddressType] = useState<'contract' | 'wallet'>('contract');
  const [contractDetails, setContractDetails] = useState<ContractDetails[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState<any>(null);

  // Load contracts from KV storage on mount
  useEffect(() => {
    loadContracts();
    loadStats();
  }, []);

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/nfts?action=list-contracts');
      const data = await response.json();
      
      if (data.success) {
        setContractDetails(data.contractDetails || []);
        console.log(`📊 Loaded ${data.totalContracts} contracts from KV storage`);
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
      setError('Failed to load contracts from database');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/nfts?action=stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Add new address
  const handleAddAddress = async () => {
    setError('');
    setSuccessMessage('');
    
    // Validate inputs
    if (!addressInput || !nameInput) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidAddress(addressInput)) {
      setError('Invalid Ethereum address format');
      return;
    }

    setIsValidating(true);

    try {
      if (addressType === 'contract') {
        // Add single contract - always accept it
        const addResponse = await fetch(
          `/api/nfts?action=add-contract&address=${addressInput}&name=${encodeURIComponent(nameInput)}`
        );
        const addData = await addResponse.json();
        
        if (addData.success) {
          if (addData.isNew) {
            setSuccessMessage(`✅ Contract "${nameInput}" added successfully!`);
          } else {
            setSuccessMessage(`ℹ️ Contract already exists in the database.`);
          }
        } else {
          setError(addData.error || 'Failed to add contract');
          setIsValidating(false);
          return;
        }
        
      } else {
        // Process wallet using the new endpoint with fallbacks
        const processResponse = await fetch('/api/process-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: addressInput,
            name: nameInput,
          }),
        });
        
        const processData = await processResponse.json();
        
        if (processData.success) {
          setSuccessMessage(
            `✅ Added ${processData.newContracts} contract${processData.newContracts !== 1 ? 's' : ''} from wallet "${nameInput}" (Method: ${processData.method})`
          );
        } else {
          // If wallet processing failed, show helpful message
          setError(
            `Could not find NFT contracts in this wallet on Base network. ` +
            `The wallet may only have NFTs on other chains. ` +
            `Try adding contract addresses directly instead.`
          );
          setIsValidating(false);
          return;
        }
      }
      
      // Reset form
      setAddressInput('');
      setNameInput('');
      setShowAddForm(false);
      
      // Reload contracts list and stats
      await loadContracts();
      await loadStats();
      
      // Notify parent to refresh artworks
      setTimeout(() => {
        onAddressAdded();
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Error adding address:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Remove contract from KV storage
  const handleRemoveContract = async (address: string) => {
    const confirmed = confirm('Remove this contract? This will affect all users.');
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/nfts?action=remove-contract&address=${address}`);
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Contract removed successfully');
        await loadContracts();
        await loadStats();
        onAddressAdded(); // Refresh artworks
        
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Failed to remove contract');
      }
    } catch (error) {
      console.error('Failed to remove contract:', error);
      setError('Failed to remove contract');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="add-address-section">
      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div className="stats-bar">
          <span>📊 {stats.currentContracts || 0} Active Contracts</span>
          {stats.totalContractsAdded && (
            <span> • Total Added: {stats.totalContractsAdded}</span>
          )}
        </div>
      )}

      {/* Toggle Add Form Button */}
      <button 
        onClick={() => setShowAddForm(!showAddForm)}
        className="add-address-toggle-btn"
      >
        {showAddForm ? '✕ Cancel' : '+ Add Contract or Wallet'}
      </button>

      {/* Add Form */}
      {showAddForm && (
        <div className="add-address-form">
          <div className="form-group">
            <label>Name/Description</label>
            <input
              type="text"
              placeholder="e.g., My Art Collection, Artist Name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="address-input"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Address Type</label>
            <div className="address-type-selector">
              <button
                className={`type-btn ${addressType === 'contract' ? 'active' : ''}`}
                onClick={() => setAddressType('contract')}
              >
                NFT Contract
              </button>
              <button
                className={`type-btn ${addressType === 'wallet' ? 'active' : ''}`}
                onClick={() => setAddressType('wallet')}
              >
                Wallet Address
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>{addressType === 'contract' ? 'Contract' : 'Wallet'} Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value.trim())}
              className="address-input"
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
            <div className="input-hint">
              {addressType === 'contract' 
                ? '📄 NFT contract address on Base. Stored in database for all users.'
                : '👛 Wallet address containing NFTs. All contracts from this wallet will be added.'}
            </div>
          </div>

          <button 
            onClick={handleAddAddress}
            disabled={isValidating || !addressInput || !nameInput}
            className="submit-address-btn"
          >
            {isValidating ? 'Validating...' : `Add ${addressType === 'contract' ? 'Contract' : 'Wallet'}`}
          </button>
        </div>
      )}

      {/* List of Contracts from KV Storage */}
      {isLoading ? (
        <div className="loading-contracts">
          <div className="mini-spinner"></div>
          <span>Loading contracts from database...</span>
        </div>
      ) : contractDetails.length > 0 ? (
        <div className="user-addresses-list">
          <div className="list-header">
            Active Contracts ({contractDetails.length})
            <span className="list-subtitle">Stored in Vercel KV • Visible to all users</span>
          </div>
          {contractDetails.map((contract) => (
            <div key={contract.address} className="user-address-item">
              <div className="address-info">
                <div className="address-name">
                  {contract.name || 'Unnamed Contract'}
                  {contract.type === 'wallet' && (
                    <span className="wallet-badge">from wallet</span>
                  )}
                </div>
                <div className="address-details">
                  📄 {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                  <span className="address-date"> • {formatDate(contract.addedAt)}</span>
                </div>
              </div>
              <div className="address-actions">
                <button
                  onClick={() => handleRemoveContract(contract.address)}
                  className="remove-btn"
                  disabled={isLoading}
                  title="Remove from database"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-message">
          No contracts added yet. Be the first to add your NFT contract!
        </div>
      )}

      {/* Info Box - Removed for cleaner UI */}
    </div>
  );
}
