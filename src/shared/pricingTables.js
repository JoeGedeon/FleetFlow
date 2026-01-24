export const PRICING_TABLES = {
  NYC: {
    peak: [
      { maxCF: 400, rate: 9.25 },
      { maxCF: 800, rate: 8.75 },
      { maxCF: Infinity, rate: 8.25 }
    ],
    offPeak: [
      { maxCF: 400, rate: 8.50 },
      { maxCF: 800, rate: 8.00 },
      { maxCF: Infinity, rate: 7.50 }
    ]
  },

  FL: {
    peak: [
      { maxCF: 400, rate: 6.75 },
      { maxCF: 800, rate: 6.25 },
      { maxCF: Infinity, rate: 5.75 }
    ],
    offPeak: [
      { maxCF: 400, rate: 5.75 },
      { maxCF: 800, rate: 5.25 },
      { maxCF: Infinity, rate: 4.75 }
    ]
  }
};
