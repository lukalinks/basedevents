import { NextRequest, NextResponse } from 'next/server';
import { 
  checkERC20Balance, 
  checkERC721Balance, 
  checkERC1155Balance,
  isValidTokenAddress 
} from '@/lib/tokenGating';

export async function POST(request: NextRequest) {
  try {
    const { 
      userAddress, 
      tokenAddress, 
      tokenType = 'ERC20', 
      requiredBalance = '1',
      tokenId 
    } = await request.json();

    // Validate required fields
    if (!userAddress || !tokenAddress) {
      return NextResponse.json(
        { error: 'User address and token address are required' },
        { status: 400 }
      );
    }

    // Validate address formats
    if (!isValidTokenAddress(userAddress) || !isValidTokenAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Validate token type
    if (!['ERC20', 'ERC721', 'ERC1155'].includes(tokenType)) {
      return NextResponse.json(
        { error: 'Invalid token type. Must be ERC20, ERC721, or ERC1155' },
        { status: 400 }
      );
    }

    // Validate required balance
    if (!requiredBalance || isNaN(parseFloat(requiredBalance)) || parseFloat(requiredBalance) <= 0) {
      return NextResponse.json(
        { error: 'Required balance must be a positive number' },
        { status: 400 }
      );
    }

    // Validate token ID for ERC1155
    if (tokenType === 'ERC1155' && (!tokenId || isNaN(parseInt(tokenId)))) {
      return NextResponse.json(
        { error: 'Token ID is required for ERC1155 tokens' },
        { status: 400 }
      );
    }

    let result;

    // Check balance based on token type
    switch (tokenType) {
      case 'ERC20':
        result = await checkERC20Balance(
          userAddress as `0x${string}`,
          tokenAddress as `0x${string}`,
          requiredBalance
        );
        break;

      case 'ERC721':
        result = await checkERC721Balance(
          userAddress as `0x${string}`,
          tokenAddress as `0x${string}`,
          requiredBalance
        );
        break;

      case 'ERC1155':
        result = await checkERC1155Balance(
          userAddress as `0x${string}`,
          tokenAddress as `0x${string}`,
          tokenId,
          requiredBalance
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported token type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      userAddress,
      tokenAddress,
      tokenType,
      requiredBalance,
      tokenId: tokenType === 'ERC1155' ? tokenId : undefined,
      ...result
    });

  } catch (error) {
    console.error('Error checking token balance:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('execution reverted')) {
        return NextResponse.json(
          { error: 'Token contract not found or invalid' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('network')) {
        return NextResponse.json(
          { error: 'Network error. Please try again.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to check token balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
