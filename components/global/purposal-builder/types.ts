export type PurposalBuilderFormState = {
  title: string;
  subtitle: string;
  nights: number;
  guests: number;
  roomSelections: Array<{
    roomId: string;
    quantity: number;
  }>;
  mattressLabel: string;
  mattressRatePerDay: number;
  mattressCount: number;
  bookingOptionSelections: Array<{
    bookingOptionId: string;
    quantity: number;
  }>;
  b2bRatePerPersonNight: number;
  b2bTitle: string;
  b2bSubtitle: string;
  b2bNote: string;
};

export type PurposalComputed = {
  roomRows: Array<{ label: string; quantity: number; ratePerNight: number; total: number }>;
  bookingOptionRows: Array<{
    label: string;
    quantity: number;
    pricePerUnit: number;
    frequency: "day" | "booking";
    total: number;
  }>;
  roomTotal: number;
  mattressTotal: number;
  bookingOptionsTotal: number;
  normalTotal: number;
  b2bTotal: number;
  savingsAmount: number;
  savingsPercent: number;
};
