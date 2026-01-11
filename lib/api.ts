'use server';

import { Asset } from './types';
import { MOCK_ASSETS } from './mockData';

export async function fetchAssets(): Promise<Asset[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_ASSETS;
}
