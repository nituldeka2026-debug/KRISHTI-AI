/**
 * Krishti AI V21 — Product configuration
 * Keep prices/limits in environment variables on production.
 */
const KRISHTI_V21_PLANS = Object.freeze({
  free: {
    id: "free",
    name: "Free",
    monthlyPriceINR: 0,
    limits: {
      messages: 50,
      images: 5,
      voice: 10,
      pdf: 5,
      webSearch: 20,
      premiumModels: 0
    },
    ads: true
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro Monthly",
    monthlyPriceINR: 299,
    limits: {
      messages: 2000,
      images: 100,
      voice: 300,
      pdf: 100,
      webSearch: 500,
      premiumModels: 300
    },
    ads: false
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "Pro Yearly",
    monthlyEquivalentINR: 249,
    yearlyPriceINR: 2988,
    limits: {
      messages: 2000,
      images: 100,
      voice: 300,
      pdf: 100,
      webSearch: 500,
      premiumModels: 300
    },
    ads: false
  }
});

if (typeof module !== "undefined") module.exports = { KRISHTI_V21_PLANS };
