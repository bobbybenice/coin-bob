
import '@testing-library/jest-dom';

// Start off with a mock fetch (can be overridden in individual tests)
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        ok: true,
    })
);
