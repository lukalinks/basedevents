import { NextRequest, NextResponse } from 'next/server';
import { getTokenInfo, isValidTokenAddress } from '@/lib/tokenGating';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const type = searchParams.get('type') as 'ERC20' | 'ERC721' | 'ERC1155' | null;

    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    if (!isValidTokenAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    const tokenType = type || 'ERC20';
    
    if (!['ERC20', 'ERC721', 'ERC1155'].includes(tokenType)) {
      return NextResponse.json(
        { error: 'Invalid token type. Must be ERC20, ERC721, or ERC1155' },
        { status: 400 }
      );
    }

    const tokenInfo = await getTokenInfo(address as `0x${string}`, tokenType);

    return NextResponse.json({
      address,
      type: tokenType,
      ...tokenInfo
    });

  } catch (error) {
    console.error('Error fetching token info:', error);
    
    // Check if it's a contract not found error
    if (error instanceof Error && error.message.includes('execution reverted')) {
      return NextResponse.json(
        { error: 'Token contract not found or invalid' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch token information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address, type = 'ERC20' } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    if (!isValidTokenAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    if (!['ERC20', 'ERC721', 'ERC1155'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid token type. Must be ERC20, ERC721, or ERC1155' },
        { status: 400 }
      );
    }

    const tokenInfo = await getTokenInfo(address as `0x${string}`, type);

    return NextResponse.json({
      address,
      type,
      ...tokenInfo
    });

  } catch (error) {
    console.error('Error fetching token info:', error);
    
    // Check if it's a contract not found error
    if (error instanceof Error && error.message.includes('execution reverted')) {
      return NextResponse.json(
        { error: 'Token contract not found or invalid' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch token information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
