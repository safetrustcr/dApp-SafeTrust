export type HotelRoom = {
  room_id: string;
  room_number: string;
  status: boolean | null;
  price_night: number;
  capacity: number;
  room_type: { name: string } | null;
};

export type HotelReservation = {
  id: string;
  reservation_status: string;
  check_in: string;
  check_out: string;
  total_amount: number;
  room: {
    room_number: string;
    hotel: { name: string } | null;
  } | null;
};

export type HotelEscrowTransaction = {
  id: string;
  contract_id: string | null;
  escrow_status: string;
  signer_address: string | null;
  created_at: string;
  reservation: {
    id: string;
    reservation_status: string;
    total_amount: number | null;
  } | null;
};

export const MOCK_HOTEL_ROOMS: HotelRoom[] = [
  {
    room_id: "r-101",
    room_number: "101",
    status: true,
    price_night: 120,
    capacity: 2,
    room_type: { name: "Deluxe" },
  },
  {
    room_id: "r-102",
    room_number: "102",
    status: false,
    price_night: 80,
    capacity: 2,
    room_type: { name: "Standard" },
  },
  {
    room_id: "r-201",
    room_number: "201",
    status: true,
    price_night: 250,
    capacity: 4,
    room_type: { name: "Suite" },
  },
  {
    room_id: "r-202",
    room_number: "202",
    status: true,
    price_night: 95,
    capacity: 2,
    room_type: { name: "Standard" },
  },
  {
    room_id: "r-301",
    room_number: "301",
    status: false,
    price_night: 180,
    capacity: 3,
    room_type: { name: "Deluxe" },
  },
];

export const MOCK_ACTIVE_RESERVATIONS: HotelReservation[] = [
  {
    id: "BK001",
    reservation_status: "CONFIRMED",
    check_in: "2026-07-28T15:00:00.000Z",
    check_out: "2026-08-01T11:00:00.000Z",
    total_amount: 480,
    room: {
      room_number: "101",
      hotel: { name: "SafeTrust Inn" },
    },
  },
  {
    id: "BK002",
    reservation_status: "PENDING",
    check_in: "2026-08-03T15:00:00.000Z",
    check_out: "2026-08-07T11:00:00.000Z",
    total_amount: 1000,
    room: {
      room_number: "201",
      hotel: { name: "SafeTrust Inn" },
    },
  },
  {
    id: "BK003",
    reservation_status: "CONFIRMED",
    check_in: "2026-08-10T15:00:00.000Z",
    check_out: "2026-08-12T11:00:00.000Z",
    total_amount: 190,
    room: {
      room_number: "202",
      hotel: { name: "SafeTrust Inn" },
    },
  },
];

export const MOCK_HOTEL_ESCROW_TRANSACTIONS: HotelEscrowTransaction[] = [
  {
    id: "esc-1",
    contract_id: "CAZT001",
    escrow_status: "FUNDED",
    signer_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOP",
    created_at: "2026-07-27T18:00:00.000Z",
    reservation: {
      id: "BK001",
      reservation_status: "CONFIRMED",
      total_amount: 480,
    },
  },
  {
    id: "esc-2",
    contract_id: "CAZT002",
    escrow_status: "PENDING",
    signer_address: "GXYZABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKL",
    created_at: "2026-07-28T09:30:00.000Z",
    reservation: {
      id: "BK002",
      reservation_status: "PENDING",
      total_amount: 1000,
    },
  },
];
