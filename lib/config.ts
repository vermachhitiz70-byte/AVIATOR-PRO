// Single source of truth – client business plan (photo spec).
// Custom client logic: NO real Aviator game; fake trading screen is visual only.
// Daily income is credited by cron per bot, using the tier matching the bot amount.

// Client ROI tiers: investment range -> total-return cap multiplier + daily ROI %.
export const BOT_PLANS = [
  { id: "starter", name: "Starter Tier", min: 10, max: 1099, multiplier: 2, dailyPct: 3, color: "green" },
  { id: "booster", name: "Booster Tier", min: 1100, max: 5099, multiplier: 3, dailyPct: 4, color: "green" },
  { id: "silver", name: "Silver Tier", min: 5100, max: 10999, multiplier: 3, dailyPct: 5, color: "gold" },
  { id: "gold", name: "Gold Tier", min: 11000, max: 20999, multiplier: 3, dailyPct: 7, color: "gold" },
  { id: "platinum", name: "Platinum Tier", min: 21000, max: 50999, multiplier: 4, dailyPct: 8, color: "red" },
  { id: "diamond", name: "Diamond Tier", min: 51000, max: 100000, multiplier: 5, dailyPct: 10, color: "red" },
] as const;

// Client spec (handwritten) – 10-Level ROI-on-ROI Income, total 18%
// L1 5%, L2–L5 2% each, L6–L10 1% each — on downline daily ROI, outside capping
export const ROI_LEVELS = [5, 2, 2, 2, 2, 1, 1, 1, 1, 1];
// Client spec – 5-Level Direct (Recharge) Income, paid on EVERY top-up
export const FIRST_RECHARGE_LEVELS = [5, 2, 1, 1, 1];

export const BUSINESS_RULES = {
  // Custom logic: tier-based daily ROI credited by cron per bot
  // Fake-trading visual: max bets per day (visual only, no ROI effect)
  dailyRunLimit: 10,
  botRoundsPerDay: "6 - 7 / day",
  withdrawalChargePct: 10,
  minWithdrawal: 2,
  maxWithdrawal: 25000,
  minInvestment: 10,
  // Client spec: 2X–5X income capping per tier (direct ROI only;
  // Direct Income + ROI-on-ROI level bonuses are OUT of capping)
  incomeCapX: "2–5 per tier",
  botValidityDays: 365,
  withdrawalWindowIST: "8:00 AM - 10:00 AM",
  cryptoGateway: "Aviator Pay Rails / USDTBSC",
  aiHelpDesk: "Enabled",
};

// Single hardcoded BEP20 deposit address — never show "loading" / placeholder to users.
export const DEPOSIT_ADDRESS = "0xf41A2fEEC860e0164416cB5D5B0c580881628507";

// Admin-editable settings (DB table `settings`, seeded from here)
export const DEFAULT_SETTINGS: Record<string, string> = {
  minDeposit: "10",
  minWithdrawal: "2",
  maxWithdrawal: "25000",
  withdrawalChargePct: "10",
  withdrawStartIST: "08:00",
  withdrawEndIST: "10:00",
  maintenanceMode: "off",
  depositAddress: process.env.BEP20_DEPOSIT_ADDRESS || DEPOSIT_ADDRESS,
  depositQr: "",
  smtpHost: "",
  smtpPort: "465",
  smtpUser: "",
  smtpPass: "",
};

export type Milestone = { tier: number; name: string; self: number; direct: number; team: number; wallet: number };
// Client rank system (handwritten): Self + Direct + Team thresholds -> withdrawable reward.
// Derived rule: each "X - Y" range splits (lower -> left metric, upper -> right metric).
export const MILESTONES: Milestone[] = [
  { tier: 1, name: "Bronze Flight Reward", self: 100, direct: 200, team: 5000, wallet: 100 },
  { tier: 2, name: "Silver Flight Reward", self: 250, direct: 500, team: 15000, wallet: 250 },
  { tier: 3, name: "Gold Flight Reward", self: 500, direct: 1000, team: 50000, wallet: 500 },
  { tier: 4, name: "Platinum Flight Reward", self: 1000, direct: 2000, team: 100000, wallet: 1000 },
  { tier: 5, name: "Diamond Flight Reward", self: 5000, direct: 10000, team: 250000, wallet: 2000 },
  { tier: 6, name: "Captain Club Reward", self: 10000, direct: 20000, team: 500000, wallet: 3500 },
  { tier: 7, name: "Sky Commander Reward", self: 15000, direct: 30000, team: 750000, wallet: 5000 },
  { tier: 8, name: "Aviator Star Reward", self: 20000, direct: 40000, team: 1000000, wallet: 7500 },
  { tier: 9, name: "Runway Leader Reward", self: 30000, direct: 60000, team: 1500000, wallet: 10000 },
  { tier: 10, name: "Flight Mentor Reward", self: 40000, direct: 80000, team: 2000000, wallet: 15000 },
  { tier: 11, name: "Jet Stream Reward", self: 50000, direct: 100000, team: 3000000, wallet: 24000 },
  { tier: 12, name: "Elite Pilot Reward", self: 75000, direct: 150000, team: 4000000, wallet: 25000 },
  { tier: 13, name: "Airline Builder Reward", self: 100000, direct: 200000, team: 5000000, wallet: 36000 },
  { tier: 14, name: "Turbo Team Reward", self: 125000, direct: 250000, team: 6500000, wallet: 40000 },
  { tier: 15, name: "Cloud Champion Reward", self: 150000, direct: 300000, team: 8000000, wallet: 50000 },
  { tier: 16, name: "Global Aviator Reward", self: 200000, direct: 400000, team: 12000000, wallet: 75000 },
  { tier: 17, name: "Supreme Capital Reward", self: 250000, direct: 500000, team: 12500000, wallet: 100000 },
  { tier: 18, name: "Royal Fleet Reward", self: 300000, direct: 600000, team: 15000000, wallet: 150000 },
  { tier: 19, name: "Legend Aviator Reward", self: 500000, direct: 1000000, team: 20000000, wallet: 200000 },
  { tier: 20, name: "Crown Aviator Reward", self: 1000000, direct: 2000000, team: 50000000, wallet: 500000 },
];

// 100 Indian names for the fake-trading live activity feed
export const FEED_NAMES = [
  "Rahul Sharma", "Priya Singh", "Amit Verma", "Neha Gupta", "Vikram Patel", "Anjali Mehta", "Rohit Kumar", "Sneha Reddy", "Arjun Nair", "Kavya Iyer",
  "Suresh Yadav", "Pooja Mishra", "Karan Malhotra", "Divya Nair", "Manish Tiwari", "Ritu Agarwal", "Sanjay Rao", "Meera Joshi", "Vikas Chauhan", "Anita Desai",
  "Rajesh Khanna", "Sunita Devi", "Deepak Saini", "Komal Rathore", "Nitin Bansal", "Shweta Pandey", "Gaurav Jain", "Nisha Kaur", "Pankaj Tripathi", "Rekha Menon",
  "Ajay Thakur", "Simran Gill", "Harish Bhatt", "Lakshmi Venkat", "Manoj Dubey", "Tara Chandran", "Varun Kapoor", "Ishita Bose", "Kunal Shah", "Radhika Pillai",
  "Sandeep Goyal", "Geeta Rawat", "Ashish Kulkarni", "Farah Khan", "Imran Sheikh", "Zoya Ansari", "Ramesh Iyer", "Usha Nambiar", "Kiran Bedi", "Mohit Sharma",
  "Jyoti Prasad", "Sahil Arora", "Naina Kapoor", "Devendra Fadnavis", "Aarav Patel", "Diya Menon", "Yash Thakur", "Ira Sharma", "Aditya Rao", "Myra Gupta",
  "Kabir Singh", "Aanya Verma", "Vivaan Reddy", "Sara Ali", "Arnav Mishra", "Navya Nair", "Krishna Yadav", "Anaya Pandey", "Ishaan Jain", "Pari Kaur",
  "Rudra Tripathi", "Saanvi Bose", "Atharv Shah", "Kiara Pillai", "Ayaan Goyal", "Aadhya Rawat", "Vihaan Kulkarni", "Aarohi Menon", "Dhruv Dubey", "Prisha Bhatt",
  "Kabir Malhotra", "Zara Khan", "Reyansh Agarwal", "Veda Joshi", "Yuvaan Chauhan", "Anika Desai", "Advait Rao", "Navya Devi", "Krish Saini", "Myra Rathore",
  "Shaan Bansal", "Ira Pandey", "Veer Jain", "Siya Kaur", "Arham Tripathi", "Drishti Menon", "Neil Thakur", "Aisha Gill", "Ryan Bhatt", "Tara Venkat",
];

export function planForAmount(amount: number) {
  return BOT_PLANS.find((p) => amount >= p.min && amount <= p.max) ?? null;
}

// ---- Locked 4-wallet system (single source of truth) ----
// Deposit is SAFE/LOCKED: only bot activation moves it, never withdrawable.
// The 3 earning wallets are withdrawable (min $2, 10% charge, 8–10 AM IST, 1/day each).
export const WALLETS = [
  { key: "principal", label: "Deposit Wallet", desc: "Your locked capital. Moves only into bots. Never withdrawable.", withdrawable: false, sources: ["deposit_confirm"] },
  { key: "roi", label: "Daily ROI Income", desc: "Daily tier % — bot auto-credit + self game play (same pool, client income #1).", withdrawable: true, sources: ["daily_roi", "game_profit", "game_loss"] },
  { key: "commission", label: "Level / Direct Income", desc: "First-recharge direct + 10-level ROI income.", withdrawable: true, sources: ["first_recharge", "roi_level"] },
  { key: "reward", label: "Reward Income", desc: "Milestone + campaign rewards.", withdrawable: true, sources: ["reward"] },
] as const;

// Ledger kinds that count as EARNINGS (for summaries; game_loss nets off game_profit)
export const EARNING_KINDS = ["daily_roi", "game_profit", "game_loss", "first_recharge", "roi_level", "reward"];
export const EARNING_GROUPS: Record<string, string[]> = {
  roi: ["daily_roi", "game_profit", "game_loss"],
  level: ["first_recharge", "roi_level"],
  reward: ["reward"],
};
