// components/BlockchainInfo.tsx
'use client';

import { useEffect, useState } from 'react';

interface BlockchainInfoProps {
  contractAddress: string;
  tokenId: string;
}

export function BlockchainInfo({ contractAddress, tokenId }: BlockchainInfoProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [currentBlock, setCurrentBlock] = useState<string>('');

  useEffect(() => {
    const fetchBlockchainData = async () => {
      try {
        // Get current block
        const blockRes = await fetch('/api/blockchain?action=current-block');
        const blockData = await blockRes.json();
        if (blockData.success) {
          setCurrentBlock(blockData.blockNumber);
        }

        // Get NFT owner
        const ownerRes = await fetch(
          `/api/blockchain?action=nft-owner&contract=${contractAddress}&tokenId=${tokenId}`
        );
        const ownerData = await ownerRes.json();

        // Get contract info
        const contractRes = await fetch(
          `/api/blockchain?action=contract-info&contract=${contractAddress}`
        );
        const contractData = await contractRes.json();

        setData({
          owner: ownerData.owner,
          contractName: contractData.name,
        });
      } catch (error) {
        console.error('Failed to fetch blockchain data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockchainData();
  }, [contractAddress, tokenId]);

  if (loading) {
    return (
      <div style={{
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#64748b',
      }}>
        Loading blockchain data...
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{
      padding: '12px',
      background: '#f0f9ff',
      borderRadius: '8px',
      fontSize: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginTop: '12px',
      border: '1px solid #bfdbfe',
    }}>
      <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
        ⛓️ On-Chain Data
      </div>
      <div style={{ color: '#64748b' }}>
        <strong>Owner:</strong> {data.owner ? `${data.owner.slice(0, 6)}...${data.owner.slice(-4)}` : 'Unknown'}
      </div>
      <div style={{ color: '#64748b' }}>
        <strong>Contract:</strong> {data.contractName || 'Unknown'}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '11px' }}>
        Block: {currentBlock ? `#${currentBlock.slice(0, 8)}` : 'Loading...'}
      </div>
    </div>
  );
}
