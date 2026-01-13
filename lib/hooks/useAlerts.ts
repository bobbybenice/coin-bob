'use client';

import { useState, useEffect, useCallback } from 'react';
import { Asset } from '@/lib/types';

export function useAlerts() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [lastAlerts, setLastAlerts] = useState<Record<string, number>>({});

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (typeof window === 'undefined') return;
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
    };

    const playSound = () => {
        // Simple synthesized beep using Web Audio API to avoid external assets
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Drop

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    };

    const triggerAlert = useCallback((asset: Asset, signal: string) => {
        const now = Date.now();
        // Prevent spam: only alert once per minute per asset type
        const key = `${asset.symbol}-${signal}`;
        if (lastAlerts[key] && now - lastAlerts[key] < 60000) return;

        console.log(`[ALERT] ${asset.symbol}: ${signal}`);
        playSound();

        if (permission === 'granted') {
            new Notification(`CoinBob Signal: ${asset.symbol}`, {
                body: `${signal} Detected! Price: $${asset.price}`,
                icon: '/icon-192.png', // Assuming pwa icon or similar exists, fallback ok
                silent: true // We play our own sound
            });
        }

        setLastAlerts(prev => ({ ...prev, [key]: now }));
    }, [lastAlerts, permission]);

    return {
        permission,
        requestPermission,
        triggerAlert
    };
}
