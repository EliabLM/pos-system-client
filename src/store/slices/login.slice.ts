import { StateCreator } from 'zustand';
import { AppState, LoginSlice, TempUser } from '../types';

export const createLoginSlice: StateCreator<AppState, [], [], LoginSlice> =
    (set, get) => ({
        stepIndex: 0,
        tempUser: null,
        setStepIndex: (stepIndex: number) => set({ stepIndex }),
        setTempUser: (user: TempUser | null) => set({ tempUser: user })
    });
