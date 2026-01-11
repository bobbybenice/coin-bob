import { WhaleTransaction } from '@/lib/types';

// Blockchain.com WebSocket Message Types
export interface BlockchainSocketMessage {
    op: string;
    x: {
        inputs: {
            prev_out: {
                value: number;
                addr: string;
            };
        }[];
        out: {
            value: number;
            addr: string;
            type: number;
        }[];
        hash: string;
        time: number;
        relayed_by: string;
    };
}

/**
 * Parses a raw Blockchain.com transaction into our WhaleTransaction format.
 * Returns null if the transaction is too small (handled by caller usually, but good utility).
 */
export function parseBlockchainTransaction(msg: BlockchainSocketMessage, btcPrice: number): WhaleTransaction | null {
    if (!msg || !msg.x) return null;

    const tx = msg.x;
    let totalOutputValue = 0;

    // Calculate total output value (Satoshi to BTC)
    tx.out.forEach(output => {
        totalOutputValue += output.value;
    });

    const amountBtc = totalOutputValue / 100000000;
    const amountUsd = amountBtc * btcPrice;

    // Filter logic can be here or in the hook. 
    // Let's just return the object and let the hook filter for flexibility.

    // Identify likely "From" address (largest input)
    const largestInput = tx.inputs.reduce((prev, current) => {
        return (prev.prev_out?.value || 0) > (current.prev_out?.value || 0) ? prev : current;
    }, tx.inputs[0]);

    // Identify likely "To" address (largest output)
    const largestOutput = tx.out.reduce((prev, current) => {
        return (prev.value || 0) > (current.value || 0) ? prev : current;
    }, tx.out[0]);

    return {
        id: tx.hash,
        blockchain: 'bitcoin',
        symbol: 'BTC',
        transaction_type: 'transfer',
        hash: tx.hash,
        from: {
            address: largestInput?.prev_out?.addr || 'Unknown',
            owner: '', // Blockchain.com doesn't identify owners in this feed
            owner_type: 'wallet'
        },
        to: {
            address: largestOutput?.addr || 'Unknown',
            owner: '',
            owner_type: 'wallet'
        },
        timestamp: tx.time,
        amount: amountBtc,
        amount_usd: amountUsd, // Calculated based on live price
        transaction_count: 1
    };
}
