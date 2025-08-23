import { StateCreator } from 'zustand';
import { AppState, AuthSlice } from '../types';
import { User } from '@/interfaces';

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> =
    (set) => ({
        user: null,
        setUser: (user: User | null) => set({ user })
    });