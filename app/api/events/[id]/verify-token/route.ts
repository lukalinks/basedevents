import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenRequirement, logTokenVerification } from '@/lib/tokenGating';
import { supabase } from '@/lib/supabaseClient';
import type { TokenRequirement } from '@/lib/events';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid user address format' },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.is_token_gated) {
      return NextResponse.json(
        { error: 'Event is not token-gated' },
        { status: 400 }
      );
    }

    if (!event.required_token_address) {
      return NextResponse.json(
        { error: 'Event token requirements not properly configured' },
        { status: 400 }
      );
    }

    // Verify token requirements
    const requirement: TokenRequirement = {
      type: event.token_gate_type || 'ERC20',
      contractAddress: event.required_token_address as `0x${string}`,
      requiredBalance: event.required_token_balance?.toString() || '1',
      symbol: event.required_token_symbol,
      name: event.required_token_name
    };

    const verificationResult = await verifyTokenRequirement(
      userAddress as `0x${string}`,
      requirement
    );

    // Log verification attempt
    await logTokenVerification(
      eventId,
      userAddress,
      event.required_token_address,
      parseFloat(verificationResult.userBalance),
      verificationResult.passed ? 'passed' : 'failed'
    );

    return NextResponse.json({
      passed: verificationResult.passed,
      userBalance: verificationResult.userBalance,
      requiredBalance: verificationResult.requiredBalance,
      tokenInfo: verificationResult.tokenInfo,
      requirement: {
        symbol: event.required_token_symbol,
        name: event.required_token_name,
        type: event.token_gate_type,
        address: event.required_token_address
      }
    });

  } catch (error) {
    console.error('Error verifying token requirement:', error);
    
    return NextResponse.json(
      { 
        error: 'Token verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Get verification history for this user and event
    const { data: verifications, error } = await supabase
      .from('token_verifications')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_address', userAddress)
      .order('verified_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching verification history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verification history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verifications: verifications || [],
      hasRecentVerification: verifications?.some(v => v.verification_status === 'passed') || false
    });

  } catch (error) {
    console.error('Error fetching verification history:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch verification history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
