import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { AppState } from './types';
import { createLoginSlice } from './slices/login.slice';
import { createAuthSlice } from './slices/auth.slice';

export const useStore = create<AppState>()(
    devtools(
        persist(
            (set, get, api) => ({
                ...createLoginSlice(set, get, api),
                ...createAuthSlice(set, get, api)
                // ...otros slices
            }),
            {
                name: 'pos-system-storage',
                storage: {
                    getItem: (name) => {
                        const value = sessionStorage.getItem(name);
                        return value ? JSON.parse(value) : null;
                    },
                    setItem: (name, value) => {
                        sessionStorage.setItem(name, JSON.stringify(value));
                    },
                    removeItem: (name) => {
                        sessionStorage.removeItem(name);
                    },
                },
            }
        )
    )
);
