export interface TempUser {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    clerkId: string;
    id: string;
}

export type LoginSlice = {
    stepIndex: number
    tempUser: TempUser | null
    setStepIndex: (stepIndex: number) => void
    setTempUser: (user: TempUser) => void
}

export type UiSlice = {
    theme: 'light' | 'dark';
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setTheme: (t: 'light' | 'dark') => void;
};

export type AppState = LoginSlice //& UiSlice; // agregar más slices según necesites
