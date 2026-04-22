import { addDays, subDays, formatISO } from "date-fns";

export type AgencyBookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type BikeStatus = "available" | "rented" | "maintenance" | "hidden";
export type BikeCategory = "scooter" | "sport" | "cruiser" | "adventure" | "touring" | "electric" | "offroad";

export interface AgencyBike {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  engineCc: number;
  category: BikeCategory;
  transmission: "manual" | "automatic" | "semi";
  licensePlate: string;
  pricePerDay: number;
  thumbnail: string;
  photos: string[];
  odometer: number;
  status: BikeStatus;
  featured?: boolean;
  licenseRequired: boolean;
  neighborhood: string;
  bookingsCount: number;
  rating: number;
  revenueLast30: number;
  color?: string;
  description?: string;
  createdAt: string;
}

export interface AgencyCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  verified: boolean;
  totalBookings: number;
  ratingGiven?: number;
}

export interface AgencyBooking {
  id: string;
  ref: string;
  customerId: string;
  bikeId: string;
  status: AgencyBookingStatus;
  pickupAt: string;
  returnAt: string;
  pickupLocation: string;
  returnLocation: string;
  totalDays: number;
  pricePerDay: number;
  totalAmount: number;
  depositAmount: number;
  motonitaFee: number;
  paymentMethod: "cash" | "card" | "other";
  paymentStatus: "unpaid" | "partial" | "paid";
  createdAt: string;
  notes?: string;
  manual?: boolean;
}

const PHOTO_SETS: Record<string, string[]> = {
  scooter: [
    "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1611241443322-b5c2c2eef03c?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1591635566278-12d0ed5b1bb6?w=1200&h=800&fit=crop",
  ],
  sport: [
    "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=1200&h=800&fit=crop",
  ],
  cruiser: [
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&h=800&fit=crop",
  ],
};

export const agencyBikes: AgencyBike[] = [
  { id: "b1", name: "Yamaha YBR 125", brand: "Yamaha", model: "YBR 125", year: 2023, engineCc: 125, category: "sport", transmission: "manual", licensePlate: "12345-A-1", pricePerDay: 180, thumbnail: PHOTO_SETS.sport[0], photos: PHOTO_SETS.sport, odometer: 12340, status: "rented", featured: true, licenseRequired: true, neighborhood: "Maârif", bookingsCount: 24, rating: 4.8, revenueLast30: 4320, color: "Blue", description: "Reliable commuter sport bike, fuel efficient.", createdAt: "2024-01-15" },
  { id: "b2", name: "Honda CG 125", brand: "Honda", model: "CG 125", year: 2022, engineCc: 125, category: "sport", transmission: "manual", licensePlate: "23456-B-2", pricePerDay: 170, thumbnail: PHOTO_SETS.sport[1], photos: PHOTO_SETS.sport, odometer: 18500, status: "available", licenseRequired: true, neighborhood: "Anfa", bookingsCount: 31, rating: 4.7, revenueLast30: 5270, color: "Black", description: "Workhorse Honda, low maintenance.", createdAt: "2023-11-02" },
  { id: "b3", name: "Peugeot Kisbee 50", brand: "Peugeot", model: "Kisbee", year: 2024, engineCc: 50, category: "scooter", transmission: "automatic", licensePlate: "34567-C-3", pricePerDay: 120, thumbnail: PHOTO_SETS.scooter[0], photos: PHOTO_SETS.scooter, odometer: 4200, status: "available", licenseRequired: false, neighborhood: "Gauthier", bookingsCount: 18, rating: 4.6, revenueLast30: 2160, color: "White", description: "Easy automatic scooter, no license needed.", createdAt: "2024-03-20" },
  { id: "b4", name: "Kymco Agility 125", brand: "Kymco", model: "Agility", year: 2023, engineCc: 125, category: "scooter", transmission: "automatic", licensePlate: "45678-D-4", pricePerDay: 160, thumbnail: PHOTO_SETS.scooter[1], photos: PHOTO_SETS.scooter, odometer: 9800, status: "maintenance", licenseRequired: true, neighborhood: "Maârif", bookingsCount: 21, rating: 4.5, revenueLast30: 3520, color: "Silver", description: "Comfortable city scooter.", createdAt: "2023-08-11" },
  { id: "b5", name: "SYM Jet 14", brand: "SYM", model: "Jet 14", year: 2023, engineCc: 125, category: "scooter", transmission: "automatic", licensePlate: "56789-E-5", pricePerDay: 150, thumbnail: PHOTO_SETS.scooter[2], photos: PHOTO_SETS.scooter, odometer: 6700, status: "rented", licenseRequired: true, neighborhood: "Sidi Maârouf", bookingsCount: 15, rating: 4.4, revenueLast30: 2700, color: "Red", description: "Sporty scooter with strong acceleration.", createdAt: "2024-02-10" },
  { id: "b6", name: "Piaggio Liberty", brand: "Piaggio", model: "Liberty 125", year: 2022, engineCc: 125, category: "scooter", transmission: "automatic", licensePlate: "67890-F-6", pricePerDay: 175, thumbnail: PHOTO_SETS.scooter[1], photos: PHOTO_SETS.scooter, odometer: 21000, status: "available", licenseRequired: true, neighborhood: "Derb Sultan", bookingsCount: 27, rating: 4.6, revenueLast30: 4480, color: "Beige", description: "Italian style and comfort.", createdAt: "2023-05-18" },
  { id: "b7", name: "Yamaha MT-07", brand: "Yamaha", model: "MT-07", year: 2024, engineCc: 689, category: "sport", transmission: "manual", licensePlate: "78901-G-7", pricePerDay: 450, thumbnail: PHOTO_SETS.sport[0], photos: PHOTO_SETS.sport, odometer: 3200, status: "available", featured: true, licenseRequired: true, neighborhood: "Anfa", bookingsCount: 8, rating: 4.9, revenueLast30: 5400, color: "Blue", description: "Naked sport bike with strong torque.", createdAt: "2024-04-03" },
  { id: "b8", name: "Honda CB500X", brand: "Honda", model: "CB500X", year: 2023, engineCc: 471, category: "adventure", transmission: "manual", licensePlate: "89012-H-8", pricePerDay: 380, thumbnail: PHOTO_SETS.sport[2], photos: PHOTO_SETS.sport, odometer: 7800, status: "hidden", licenseRequired: true, neighborhood: "Gauthier", bookingsCount: 11, rating: 4.7, revenueLast30: 0, color: "Red", description: "Adventure tourer perfect for Atlas trips.", createdAt: "2023-09-22" },
];

export const agencyCustomers: AgencyCustomer[] = [
  { id: "c1", name: "Youssef El Amrani", phone: "+212 661 23 45 67", email: "youssef.amrani@mail.com", avatar: "https://i.pravatar.cc/100?img=12", verified: true, totalBookings: 5, ratingGiven: 5 },
  { id: "c2", name: "Fatima Bennani", phone: "+212 662 34 56 78", email: "fatima.bennani@mail.com", avatar: "https://i.pravatar.cc/100?img=47", verified: true, totalBookings: 3, ratingGiven: 5 },
  { id: "c3", name: "Amine Ziani", phone: "+212 663 45 67 89", email: "amine.ziani@mail.com", avatar: "https://i.pravatar.cc/100?img=33", verified: false, totalBookings: 1 },
  { id: "c4", name: "Khadija Rachidi", phone: "+212 664 56 78 90", email: "khadija.rachidi@mail.com", avatar: "https://i.pravatar.cc/100?img=44", verified: true, totalBookings: 7, ratingGiven: 4 },
  { id: "c5", name: "Luca Rossi", phone: "+39 333 12 34 567", email: "luca.rossi@mail.com", avatar: "https://i.pravatar.cc/100?img=11", verified: true, totalBookings: 2, ratingGiven: 5 },
  { id: "c6", name: "Sophie Martin", phone: "+33 6 12 34 56 78", email: "sophie.martin@mail.com", avatar: "https://i.pravatar.cc/100?img=49", verified: true, totalBookings: 4 },
  { id: "c7", name: "James Chen", phone: "+1 415 555 0123", email: "james.chen@mail.com", avatar: "https://i.pravatar.cc/100?img=15", verified: false, totalBookings: 1 },
];

export const neighborhoods = ["Maârif", "Anfa", "Gauthier", "Derb Sultan", "Sidi Maârouf"];

const today = new Date();
const iso = (d: Date) => formatISO(d);

const seed: Array<Partial<AgencyBooking> & { customerId: string; bikeId: string; status: AgencyBookingStatus; pickupOffset: number; days: number }> = [
  { customerId: "c1", bikeId: "b1", status: "in_progress", pickupOffset: 0, days: 3 },
  { customerId: "c2", bikeId: "b3", status: "confirmed", pickupOffset: 0, days: 1 },
  { customerId: "c4", bikeId: "b5", status: "in_progress", pickupOffset: -2, days: 4 },
  { customerId: "c5", bikeId: "b7", status: "confirmed", pickupOffset: 0, days: 2 },
  { customerId: "c6", bikeId: "b2", status: "completed", pickupOffset: -3, days: 3 },
  { customerId: "c3", bikeId: "b4", status: "pending", pickupOffset: 2, days: 5 },
  { customerId: "c7", bikeId: "b6", status: "pending", pickupOffset: 4, days: 7 },
  { customerId: "c2", bikeId: "b1", status: "pending", pickupOffset: 1, days: 2 },
  { customerId: "c4", bikeId: "b3", status: "pending", pickupOffset: 3, days: 1 },
  { customerId: "c1", bikeId: "b2", status: "confirmed", pickupOffset: 5, days: 3 },
  { customerId: "c5", bikeId: "b5", status: "confirmed", pickupOffset: 7, days: 4 },
  { customerId: "c6", bikeId: "b6", status: "confirmed", pickupOffset: 10, days: 2 },
  { customerId: "c2", bikeId: "b4", status: "confirmed", pickupOffset: 12, days: 5 },
  { customerId: "c1", bikeId: "b1", status: "completed", pickupOffset: -10, days: 4 },
  { customerId: "c2", bikeId: "b3", status: "completed", pickupOffset: -15, days: 2 },
  { customerId: "c4", bikeId: "b5", status: "completed", pickupOffset: -20, days: 6 },
  { customerId: "c5", bikeId: "b7", status: "completed", pickupOffset: -25, days: 3 },
  { customerId: "c6", bikeId: "b2", status: "completed", pickupOffset: -30, days: 5 },
  { customerId: "c1", bikeId: "b6", status: "completed", pickupOffset: -35, days: 2 },
  { customerId: "c4", bikeId: "b1", status: "completed", pickupOffset: -40, days: 7 },
  { customerId: "c2", bikeId: "b4", status: "completed", pickupOffset: -45, days: 3 },
  { customerId: "c3", bikeId: "b3", status: "cancelled", pickupOffset: -5, days: 2 },
  { customerId: "c7", bikeId: "b5", status: "no_show", pickupOffset: -8, days: 1 },
  { customerId: "c3", bikeId: "b6", status: "cancelled", pickupOffset: -18, days: 4 },
  { customerId: "c7", bikeId: "b2", status: "cancelled", pickupOffset: -50, days: 3 },
  { customerId: "c6", bikeId: "b4", status: "no_show", pickupOffset: -55, days: 2 },
];

export const agencyBookings: AgencyBooking[] = seed.map((b, i) => {
  const bike = agencyBikes.find((x) => x.id === b.bikeId)!;
  const pickup = b.pickupOffset >= 0 ? addDays(today, b.pickupOffset) : subDays(today, Math.abs(b.pickupOffset));
  const ret = addDays(pickup, b.days);
  const total = bike.pricePerDay * b.days;
  return {
    id: `bk-${(8300 + i).toString()}`,
    ref: `#${8300 + i}`,
    customerId: b.customerId,
    bikeId: b.bikeId,
    status: b.status,
    pickupAt: iso(pickup),
    returnAt: iso(ret),
    pickupLocation: neighborhoods[i % neighborhoods.length],
    returnLocation: neighborhoods[(i + 1) % neighborhoods.length],
    totalDays: b.days,
    pricePerDay: bike.pricePerDay,
    totalAmount: total,
    depositAmount: Math.round(total * 0.3),
    motonitaFee: 50,
    paymentMethod: i % 3 === 0 ? "card" : "cash",
    paymentStatus: b.status === "completed" ? "paid" : b.status === "in_progress" ? "partial" : "unpaid",
    createdAt: iso(subDays(pickup, 2)),
    notes: i % 5 === 0 ? "Customer requested helmet + lock." : undefined,
  } as AgencyBooking;
});

export const findBooking = (id: string) => agencyBookings.find((b) => b.id === id);
export const findCustomer = (id: string) => agencyCustomers.find((c) => c.id === id);
export const findBike = (id: string) => agencyBikes.find((b) => b.id === id);

export const activityFeed = [
  { id: 1, icon: "calendar-plus", text: "New booking from Karim B. for Yamaha YBR125", at: subDays(today, 0), link: "/agency/bookings" },
  { id: 2, icon: "wallet", text: "Payment of 50 MAD deducted for booking #8312", at: subDays(today, 0), link: "/agency/bookings/bk-8312" },
  { id: 3, icon: "star", text: "Fatima B. left a 5-star review", at: subDays(today, 1), link: "/agency/bookings" },
  { id: 4, icon: "bike", text: "Motorbike 'Honda CG125' marked unavailable", at: subDays(today, 1), link: "/agency/motorbikes" },
  { id: 5, icon: "user-plus", text: "New team member 'Hicham' invited", at: subDays(today, 2), link: "/agency/team" },
  { id: 6, icon: "shield-check", text: "Verification step 'Bank details' approved", at: subDays(today, 3), link: "/agency/verification" },
  { id: 7, icon: "calendar", text: "Booking #8305 marked as completed", at: subDays(today, 3), link: "/agency/bookings" },
  { id: 8, icon: "wallet", text: "Wallet topped up with 500 MAD", at: subDays(today, 4), link: "/agency/wallet" },
  { id: 9, icon: "message-circle", text: "New message from Sophie M.", at: subDays(today, 5), link: "/agency/messages" },
  { id: 10, icon: "calendar", text: "Booking #8298 cancelled by customer", at: subDays(today, 6), link: "/agency/bookings" },
];

export const bookingsPerDay = Array.from({ length: 30 }, (_, i) => {
  const d = subDays(today, 29 - i);
  const count = agencyBookings.filter((b) => {
    const p = new Date(b.createdAt);
    return p.toDateString() === d.toDateString();
  }).length + Math.floor(Math.random() * 3);
  return { date: d.toISOString().slice(5, 10), count };
});

export const revenuePerWeek = Array.from({ length: 12 }, (_, i) => {
  const weekStart = subDays(today, (11 - i) * 7);
  return {
    week: `W${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
    revenue: 800 + Math.floor(Math.random() * 2400),
  };
});

// Per-bike revenue (last 6 months)
export const bikeRevenueByMonth = (bikeId: string) => {
  const seedNum = bikeId.charCodeAt(1) || 1;
  return Array.from({ length: 6 }, (_, i) => {
    const monthStart = subDays(today, (5 - i) * 30);
    return {
      month: monthStart.toLocaleString("en", { month: "short" }),
      revenue: 800 + ((seedNum * 73 + i * 211) % 3200),
    };
  });
};

// ===== MESSAGES =====
export interface AgencyMessage {
  id: string;
  conversationId: string;
  fromCustomer: boolean;
  text: string;
  at: string;
  read: boolean;
  flagged?: boolean;
  flagReasons?: string[];
  attachment?: { type: "image"; url: string };
}

export interface AgencyConversation {
  id: string;
  customerId: string;
  bookingId?: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  starred?: boolean;
  archived?: boolean;
  flagged?: boolean;
}

export const agencyConversations: AgencyConversation[] = [
  { id: "conv-1", customerId: "c1", bookingId: "bk-8300", lastMessage: "Great, see you at 10am tomorrow!", lastAt: iso(subDays(today, 0)), unread: 0, starred: true },
  { id: "conv-2", customerId: "c2", bookingId: "bk-8307", lastMessage: "Can you send me your WhatsApp number? It's easier.", lastAt: iso(subDays(today, 0)), unread: 2, flagged: true },
  { id: "conv-3", customerId: "c3", bookingId: "bk-8305", lastMessage: "Is the Kymco Agility still available next week?", lastAt: iso(subDays(today, 1)), unread: 1 },
  { id: "conv-4", customerId: "c4", bookingId: "bk-8302", lastMessage: "Thanks, the bike was perfect!", lastAt: iso(subDays(today, 2)), unread: 0 },
  { id: "conv-5", customerId: "c5", bookingId: "bk-8303", lastMessage: "Where exactly do I pick up the MT-07?", lastAt: iso(subDays(today, 0)), unread: 1 },
  { id: "conv-6", customerId: "c6", lastMessage: "Hello, do you offer airport delivery?", lastAt: iso(subDays(today, 3)), unread: 0 },
  { id: "conv-7", customerId: "c7", bookingId: "bk-8306", lastMessage: "I'll pay cash at pickup, ok?", lastAt: iso(subDays(today, 4)), unread: 0, archived: true },
  { id: "conv-8", customerId: "c1", lastMessage: "One more question about insurance", lastAt: iso(subDays(today, 5)), unread: 0 },
  { id: "conv-9", customerId: "c4", lastMessage: "Booking confirmed, thanks!", lastAt: iso(subDays(today, 7)), unread: 0, starred: true },
  { id: "conv-10", customerId: "c2", lastMessage: "Can I extend by 2 days?", lastAt: iso(subDays(today, 8)), unread: 0 },
];

export const agencyMessages: AgencyMessage[] = [
  // conv-1
  { id: "m1", conversationId: "conv-1", fromCustomer: true, text: "Hi, I'd like to confirm pickup for tomorrow.", at: iso(subDays(today, 1)), read: true },
  { id: "m2", conversationId: "conv-1", fromCustomer: false, text: "Hello Youssef! Yes, you're confirmed for tomorrow.", at: iso(subDays(today, 1)), read: true },
  { id: "m3", conversationId: "conv-1", fromCustomer: false, text: "Pickup is at our Maârif location at 10am. Bring your ID.", at: iso(subDays(today, 1)), read: true },
  { id: "m4", conversationId: "conv-1", fromCustomer: true, text: "Great, see you at 10am tomorrow!", at: iso(subDays(today, 0)), read: true },
  // conv-2 (flagged)
  { id: "m5", conversationId: "conv-2", fromCustomer: true, text: "Hi, is the scooter still available for next week?", at: iso(subDays(today, 1)), read: true },
  { id: "m6", conversationId: "conv-2", fromCustomer: false, text: "Yes, it's available! Would you like me to confirm?", at: iso(subDays(today, 1)), read: true },
  { id: "m7", conversationId: "conv-2", fromCustomer: true, text: "Can you send me your WhatsApp number? It's easier. Maybe we can pay cash directly.", at: iso(subDays(today, 0)), read: false, flagged: true, flagReasons: ["whatsapp", "off-platform-payment"] },
  { id: "m8", conversationId: "conv-2", fromCustomer: true, text: "Or you can call me at 0612345678", at: iso(subDays(today, 0)), read: false, flagged: true, flagReasons: ["phone-number"] },
  // conv-3
  { id: "m9", conversationId: "conv-3", fromCustomer: true, text: "Is the Kymco Agility still available next week?", at: iso(subDays(today, 1)), read: false },
  // conv-4
  { id: "m10", conversationId: "conv-4", fromCustomer: false, text: "Hope you enjoyed the ride!", at: iso(subDays(today, 2)), read: true },
  { id: "m11", conversationId: "conv-4", fromCustomer: true, text: "Thanks, the bike was perfect!", at: iso(subDays(today, 2)), read: true },
  // conv-5
  { id: "m12", conversationId: "conv-5", fromCustomer: true, text: "Where exactly do I pick up the MT-07?", at: iso(subDays(today, 0)), read: false },
];

// ===== Manual bookings (calendar walk-ins) =====
export const manualBookings: AgencyBooking[] = [
  {
    id: "manual-1",
    ref: "#M001",
    customerId: "c1",
    bikeId: "b6",
    status: "confirmed",
    pickupAt: iso(addDays(today, 1)),
    returnAt: iso(addDays(today, 4)),
    pickupLocation: "Maârif",
    returnLocation: "Maârif",
    totalDays: 3,
    pricePerDay: 175,
    totalAmount: 525,
    depositAmount: 200,
    motonitaFee: 0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    createdAt: iso(today),
    notes: "Walk-in customer, paid cash",
    manual: true,
  },
];
