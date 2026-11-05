import type { Reservation, ReservationChangeRequest } from "./domain";
export type AdminSummary = {
    today: number;
    month: number;
    tasks: {
        reservationApprovals: number;
        cancellationApprovals: number;
        confirmedReservationRequests: number;
        temporaryExpired: number;
        storeUnassigned: number;
        menuUnselected: number;
        preContact: number;
        preContactDue: number;
        changeRequests: number;
        unansweredInquiries: number;
    };
};
export type ReservationPage = {
    reservations: Reservation[];
    total: number;
    page: number;
    pageSize: number;
};
export type AdminScreenData = {
    summary: AdminSummary;
    reservations: Reservation[];
    requests: ReservationChangeRequest[];
};
