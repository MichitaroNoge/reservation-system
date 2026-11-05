import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function reservationPageSource(){return (await Promise.all(['app/page.tsx','app/reservations/admin-app.tsx','app/reservations/customer-portal.tsx','app/reservations/reservation-shared.tsx'].map(file=>readFile(path.join(process.cwd(),file),'utf8')))).join('\n');}
