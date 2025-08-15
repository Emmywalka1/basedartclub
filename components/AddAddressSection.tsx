// components/AddAddressSection.tsx
'use client';

import { useState, useEffect } from 'react';

interface AddAddressSectionProps {
  onAddressAdded: () => void;
}

export interface UserAddress {
  address: string;
  name: string;
  type: 'contract' | 'wallet';
  addedAt: string;
  enabled: boolean;
}

export default function AddAddressSection({ onAddressAdded }: AddAddressSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [addressType, setAddressType] = useState<'contract' | 'wallet'>('contract');
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  // Load saved addresses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('userAddresses');
    if (saved) {
      try {
        setUserAddresses(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved addresses');
      }
    }
  }, []);

  // Save addresses to localStorage whenever they change
  useEffect(() => {
    if (userAddresses.length > 0) {
      localStorage.setItem('userAddresses', JSON.stringify(userAddresses));
    }
  }, [userAddresses]);

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Add new address
  const handleAddAddress = async () => {
    setError('');
    
    // Validate inputs
    if (!addressInput || !nameInput) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidAddress(addressInput)) {
      setError('Invalid Ethereum address format');
      return;
    }

    // Check if already exists
    if (userAddresses.some(a => a.address.toLowerCase() === addressInput.toLowerCase())) {
      setError('This address has already been added');
      return;
    }

    setIsValidating(true);

    try {
      // Validate that the address exists and has NFTs
      const response = await fetch(`/api/validate-address?address=${addressInput}&type=${addressType}`);
      const data = await response.json();

      if (!data.valid) {
        setError(data.message || 'Address validation failed');
        setIsValidating(false);
        return;
      }

      // Add to list
      const newAddress: UserAddress = {
        address: addressInput,
        name: nameInput,
        type: addressType,
        addedAt: new Date().toISOString(),
        enabled: true
      };

      setUserAddresses([...userAddresses, newAddress]);
      
      // Reset form
      setAddressInput('');
      setNameInput('');
      setShowAddForm(false);
      
      // Notify parent to refresh artworks
      onAddressAdded();
      
    } catch (error) {
      setError('Failed to validate address. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Remove address
  const handleRemoveAddress = (address: string) => {
    const confirmed = confirm('Remove this address from your list?');
    if (confirmed) {
      setUserAddresses(userAddresses.filter(a => a.address !== address));
      // Clear from localStorage if no addresses left
      if (userAddresses.length === 1) {
        localStorage.removeItem('userAddresses');
      }
      onAddressAdded(); // Refresh artworks
    }
  };

  // Toggle address enabled/disabled
  const handleToggleAddress = (address: string) => {
    setUserAddresses(userAddresses.map(a => 
      a.address === address ? { ...a, enabled: !a.enabled } : a
    ));
    onAddressAdded(); // Refresh artworks
  };

  return (
    <div className="add-address-section">
      {/* Toggle Add Form Button */}
      <button 
        onClick={() => setShowAddForm(!showAddForm)}
        className="add-address-toggle-btn"
      >
        {showAddForm ? '✕ Cancel' : '+ Add Your Art'}
      </button>

      {/* Add Form */}
      {showAddForm && (
        <div className="add-address-form">
          <div className="form-group">
            <label>Artist/Collection Name</label>
            <input
              type="text"
              placeholder="e.g., My Art Collection"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="address-input"
            />
          </div>

          <div className="form-group">
            <label>Address Type</label>
            <div className="address-type-selector">
              <button
                className={`type-btn ${addressType === 'contract' ? 'active' : ''}`}
                onClick={() => setAddressType('contract')}
              >
                Contract
              </button>
              <button
                className={`type-btn ${addressType === 'wallet' ? 'active' : ''}`}
                onClick={() => setAddressType('wallet')}
              >
                Wallet
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
                ? 'Enter your NFT contract address on Base'
                : 'Enter your wallet address to show NFTs you own'}
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            onClick={handleAddAddress}
            disabled={isValidating || !addressInput || !nameInput}
            className="submit-address-btn"
          >
            {isValidating ? 'Validating...' : 'Add Address'}
          </button>
        </div>
      )}

      {/* List of Added Addresses */}
      {userAddresses.length > 0 && (
        <div className="user-addresses-list">
          <div className="list-header">Your Added Collections</div>
          {userAddresses.map((addr) => (
            <div key={addr.address} className="user-address-item">
              <div className="address-info">
                <div className="address-name">{addr.name}</div>
                <div className="address-details">
                  {addr.type === 'contract' ? '📄' : '👛'} 
                  {' ' + addr.address.slice(0, 6)}...{addr.address.slice(-4)}
                </div>
              </div>
              <div className="address-actions">
                <button
                  onClick={() => handleToggleAddress(addr.address)}
                  className={`toggle-btn ${addr.enabled ? 'enabled' : 'disabled'}`}
                >
                  {addr.enabled ? '✓' : '○'}
                </button>
                <button
                  onClick={() => handleRemoveAddress(addr.address)}
                  className="remove-btn"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
