/**
 * SM-2 Algorithm implementation
 * @param {number} quality - User feedback (0: Forgot, 3: Hard, 4: Good, 5: Easy)
 * @param {number} prevInterval - Previous interval in days
 * @param {number} prevRepetition - Previous continuous successful repetitions
 * @param {number} prevEfactor - Previous easiness factor
 * @returns {Object} - New state { interval, repetition, efactor, nextReviewDate }
 */
export const calculateSM2 = (quality, prevInterval, prevRepetition, prevEfactor) => {
    let interval;
    let repetition;
    let efactor;

    // Convert values from strings (if they came from Google Sheets) to numbers
    const q = Number(quality);
    const pI = Number(prevInterval) || 0;
    const pR = Number(prevRepetition) || 0;
    const pE = Number(prevEfactor) || 2.5;

    // Calculate new E-Factor
    // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    efactor = pE + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (efactor < 1.3) efactor = 1.3; // Minimum E-Factor is 1.3

    if (q >= 3) {
        // Correct response
        if (pR === 0) {
            interval = 1;
        } else if (pR === 1) {
            interval = 6;
        } else {
            interval = Math.round(pI * efactor);
        }
        repetition = pR + 1;
    } else {
        // Incorrect response
        repetition = 0;
        interval = 1;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
        interval,
        repetition,
        efactor: parseFloat(efactor.toFixed(2)),
        nextReviewDate: nextReviewDate.toISOString()
    };
};
