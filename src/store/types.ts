import { TempUser, User } from "@/interfaces";

export type LoginSlice = {
    stepIndex: number
    tempUser: TempUser | null
    setStepIndex: (stepIndex: number) => void
    setTempUser: (user: TempUser | null) => void
}

export type UiSlice = {
    theme: 'light' | 'dark';
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setTheme: (t: 'light' | 'dark') => void;
};

export type AuthSlice = {
    user: User | null;
    storeId: string | null;
    setUser: (user: User | null) => void;
    setStoreId: (storeId: string | null) => void;
}

export type AppState = LoginSlice & AuthSlice //& UiSlice; // agregar más slices según necesites
