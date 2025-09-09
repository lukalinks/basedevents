import { NextRequest, NextResponse } from 'next/server'
import { supportEvent, getEventSupport, getEventSupportTotal, getEventById } from '@/lib/events'
import { waitForTxReceipt } from '@/lib/blockchain-base'

// POST: Support an event with USDC
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    const { supporterAddress, amountUSDC, txHash, supporterName } = await request.json()

    if (!supporterAddress || !amountUSDC || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: supporterAddress, amountUSDC, txHash' },
        { status: 400 }
      )
    }

    if (amountUSDC <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get event to find host address
    const event = await getEventById(eventId)
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const hostAddress = event.creator

    // Record the support transaction
    const support = await supportEvent(
      eventId,
      supporterAddress,
      hostAddress,
      amountUSDC,
      txHash,
      supporterName
    )

    // Optionally wait for transaction confirmation (in background)
    // This could be moved to a separate webhook or background job
    setTimeout(async () => {
      try {
        console.log('🔄 Waiting for transaction confirmation:', txHash)
        const receipt = await waitForTxReceipt(txHash as `0x${string}`)
        if (receipt.status === 'success') {
          console.log('✅ Transaction confirmed, updating status')
          // Update status to confirmed
          const { confirmSupportTransaction } = await import('@/lib/events')
          await confirmSupportTransaction(txHash)
        }
      } catch (error) {
        console.error('❌ Error confirming transaction:', error)
      }
    }, 1000)

    return NextResponse.json({ support })
  } catch (error) {
    console.error('Error creating support transaction:', error)
    return NextResponse.json(
      { error: 'Failed to record support transaction' },
      { status: 500 }
    )
  }
}

// GET: Get support transactions for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    const url = new URL(request.url)
    const getTotalOnly = url.searchParams.get('total') === 'true'

    if (getTotalOnly) {
      const total = await getEventSupportTotal(eventId)
      return NextResponse.json({ total })
    }

    const support = await getEventSupport(eventId)
    return NextResponse.json({ support })
  } catch (error) {
    console.error('Error fetching event support:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support data' },
      { status: 500 }
    )
  }
}