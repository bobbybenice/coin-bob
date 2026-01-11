'use client';

import { useState, useEffect, useRef } from 'react';
import { WhaleTransaction } from '@/lib/types';
import { parseBlockchainTransaction, BlockchainSocketMessage } from '@/lib/services/whale';
import { useMarketData } from '@/lib/hooks/useMarketData';

// Minimum value in USD to be considered a "Whale"
const MIN_WHALE_VALUE_USD = 1000000;

export function useWhaleData() {
    const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
    const { assets } = useMarketData();
    const btcPriceRef = useRef<number>(0);
    const socketRef = useRef<WebSocket | null>(null);

    // Keep BTC price updated in a ref for the socket callback to access without re-binding
    useEffect(() => {
        const btc = assets.find(a => a.symbol === 'BTC');
        if (btc) {
            btcPriceRef.current = btc.price;
        }
    }, [assets]);

    useEffect(() => {
        let mounted = true;

        const connect = () => {
            if (socketRef.current?.readyState === WebSocket.OPEN) return;

            setStatus('connecting');
            const socket = new WebSocket('wss://ws.blockchain.info/inv');
            socketRef.current = socket;

            socket.onopen = () => {
                if (mounted) {
                    setStatus('connected');
                    // Subscribe to unconfirmed transactions
                    socket.send(JSON.stringify({ "op": "unconfirmed_sub" }));
                }
            };

            socket.onmessage = (event) => {
                if (!mounted) return;

                try {
                    const msg: BlockchainSocketMessage = JSON.parse(event.data);

                    // We need a valid BTC price to calculate value
                    if (btcPriceRef.current <= 0) return;

                    if (msg.op === 'utx') {
                        const whaleTx = parseBlockchainTransaction(msg, btcPriceRef.current);

                        if (whaleTx && whaleTx.amount_usd >= MIN_WHALE_VALUE_USD) {
                            setTransactions(prev => {
                                // Keep last 50 transactions, add new one to top
                                const newState = [whaleTx, ...prev].slice(0, 50);
                                return newState;
                            });
                        }
                    }
                } catch (e) {
                    console.error('Error parsing blockchain message', e);
                }
            };

            socket.onerror = (e) => {
                if (mounted) {
                    console.error('WebSocket error', e);
                    setStatus('error');
                }
            };

            socket.onclose = () => {
                if (mounted) {
                    setStatus('disconnected');
                    // Simple reconnect logic could go here
                }
            };
        };

        connect();

        // Reconnect interval check
        const interval = setInterval(() => {
            if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
                connect();
            }
        }, 10000);

        return () => {
            mounted = false;
            clearInterval(interval);
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    return {
        transactions,
        isLoading: status === 'connecting',
        error: status === 'error' ? 'Connection Error' : null,
        status
    };
}
