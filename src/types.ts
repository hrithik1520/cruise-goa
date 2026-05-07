export interface Cruise {
  id: string;
  title: string;
  description: string;
  price: number;
  childPrice: number;
  duration: string;
  imageUrl: string;
  images: string[];
  capacity: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  cruiseId: string;
  userId: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentIntentId?: string;
  createdAt: any;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
}
