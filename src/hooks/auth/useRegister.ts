import { useStore } from "@/store"

export const useRegister = () => {
    const { stepIndex, tempUser, setStepIndex, setTempUser } = useStore();

    const handleNext = () => {
        setStepIndex(stepIndex + 1)
    }

    const handleBack = () => {
        if (stepIndex === 0) return;

        setStepIndex(stepIndex - 1)
    }

    return { stepIndex, tempUser, handleNext, handleBack, setTempUser, setStepIndex }
}