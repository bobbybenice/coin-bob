'use server';

import { Asset } from './types';

export async function fetchAssets(): Promise<Asset[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [];
}
