import { addDays, subDays, formatISO } from "date-fns";

export type AgencyBookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface AgencyBike {
  id: string;
  name: string;
  model: string;
  year: number;
  engineCc: number;
  licensePlate: string;
  pricePerDay: number;
  thumbnail: string;
  odometer: number;
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
}

export const agencyBikes: AgencyBike[] = [
  { id: "b1", name: "Yamaha YBR 125", model: "YBR 125", year: 2023, engineCc: 125, licensePlate: "12345-A-1", pricePerDay: 180, thumbnail: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200&h=200&fit=crop", odometer: 12340 },
  { id: "b2", name: "Honda CG 125", model: "CG 125", year: 2022, engineCc: 125, licensePlate: "23456-B-2", pricePerDay: 170, thumbnail: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=200&h=200&fit=crop", odometer: 18500 },
  { id: "b3", name: "Peugeot Kisbee 50", model: "Kisbee", year: 2024, engineCc: 50, licensePlate: "34567-C-3", pricePerDay: 120, thumbnail: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=200&h=200&fit=crop", odometer: 4200 },
  { id: "b4", name: "Kymco Agility 125", model: "Agility", year: 2023, engineCc: 125, licensePlate: "45678-D-4", pricePerDay: 160, thumbnail: "https://images.unsplash.com/photo-1611241443322-b5c2c2eef03c?w=200&h=200&fit=crop", odometer: 9800 },
  { id: "b5", name: "SYM Jet 14", model: "Jet 14", year: 2023, engineCc: 125, licensePlate: "56789-E-5", pricePerDay: 150, thumbnail: "https://images.unsplash.com/photo-1591635566278-12d0ed5b1bb6?w=200&h=200&fit=crop", odometer: 6700 },
  { id: "b6", name: "Piaggio Liberty", model: "Liberty 125", year: 2022, engineCc: 125, licensePlate: "67890-F-6", pricePerDay: 175, thumbnail: "https://images.unsplash.com/photo-1611241443322-b5c2c2eef03c?w=200&h=200&fit=crop", odometer: 21000 },
  { id: "b7", name: "Yamaha MT-07", model: "MT-07", year: 2024, engineCc: 689, licensePlate: "78901-G-7", pricePerDay: 450, thumbnail: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=200&h=200&fit=crop", odometer: 3200 },
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
  // Today's schedule
  { customerId: "c1", bikeId: "b1", status: "in_progress", pickupOffset: 0, days: 3 },
  { customerId: "c2", bikeId: "b3", status: "confirmed", pickupOffset: 0, days: 1 },
  { customerId: "c4", bikeId: "b5", status: "in_progress", pickupOffset: -2, days: 4 },
  { customerId: "c5", bikeId: "b7", status: "confirmed", pickupOffset: 0, days: 2 },
  { customerId: "c6", bikeId: "b2", status: "completed", pickupOffset: -3, days: 3 },
  // Pending
  { customerId: "c3", bikeId: "b4", status: "pending", pickupOffset: 2, days: 5 },
  { customerId: "c7", bikeId: "b6", status: "pending", pickupOffset: 4, days: 7 },
  { customerId: "c2", bikeId: "b1", status: "pending", pickupOffset: 1, days: 2 },
  { customerId: "c4", bikeId: "b3", status: "pending", pickupOffset: 3, days: 1 },
  // Upcoming confirmed
  { customerId: "c1", bikeId: "b2", status: "confirmed", pickupOffset: 5, days: 3 },
  { customerId: "c5", bikeId: "b5", status: "confirmed", pickupOffset: 7, days: 4 },
  { customerId: "c6", bikeId: "b6", status: "confirmed", pickupOffset: 10, days: 2 },
  { customerId: "c2", bikeId: "b4", status: "confirmed", pickupOffset: 12, days: 5 },
  // Completed history
  { customerId: "c1", bikeId: "b1", status: "completed", pickupOffset: -10, days: 4 },
  { customerId: "c2", bikeId: "b3", status: "completed", pickupOffset: -15, days: 2 },
  { customerId: "c4", bikeId: "b5", status: "completed", pickupOffset: -20, days: 6 },
  { customerId: "c5", bikeId: "b7", status: "completed", pickupOffset: -25, days: 3 },
  { customerId: "c6", bikeId: "b2", status: "completed", pickupOffset: -30, days: 5 },
  { customerId: "c1", bikeId: "b6", status: "completed", pickupOffset: -35, days: 2 },
  { customerId: "c4", bikeId: "b1", status: "completed", pickupOffset: -40, days: 7 },
  { customerId: "c2", bikeId: "b4", status: "completed", pickupOffset: -45, days: 3 },
  // Cancelled / no-show
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

// Last 30 days bookings per day for chart
export const bookingsPerDay = Array.from({ length: 30 }, (_, i) => {
  const d = subDays(today, 29 - i);
  const count = agencyBookings.filter((b) => {
    const p = new Date(b.createdAt);
    return p.toDateString() === d.toDateString();
  }).length + Math.floor(Math.random() * 3);
  return { date: d.toISOString().slice(5, 10), count };
});

// Last 12 weeks revenue
export const revenuePerWeek = Array.from({ length: 12 }, (_, i) => {
  const weekStart = subDays(today, (11 - i) * 7);
  return {
    week: `W${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
    revenue: 800 + Math.floor(Math.random() * 2400),
  };
});
