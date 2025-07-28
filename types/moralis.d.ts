// types/moralis.d.ts

declare module 'moralis' {
  export interface MoralisConfig {
    apiKey: string;
  }

  export interface MoralisNFT {
    token_id: string;
    contract_type: 'ERC721' | 'ERC1155';
    name?: string;
    symbol?: string;
    metadata?: any;
    normalized_metadata?: {
      name?: string;
      description?: string;
      image?: string;
      image_url?: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
    amount?: string;
  }

  export interface MoralisNFTResponse {
    result: MoralisNFT[];
    page: number;
    page_size: number;
    cursor?: string;
  }

  export interface MoralisClient {
    EvmApi: {
      nft: {
        getContractNFTs: (params: {
          chain: string;
          format?: string;
          limit?: number;
          address: string;
          normalizeMetadata?: boolean;
        }) => Promise<MoralisNFTResponse>;
      };
    };
  }

  const Moralis: {
    start: (config: MoralisConfig) => Promise<void>;
    EvmApi: MoralisClient['EvmApi'];
  };

  export default Moralis;
}
