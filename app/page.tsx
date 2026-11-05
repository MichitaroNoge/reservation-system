"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { CustomerPortalMode } from './reservations/reservation-shared';
const Loading = () => <p role='status' className='p-5 text-sm text-muted-foreground'>画面を読み込み中…</p>;
const AdminApp = dynamic(() => import('./reservations/admin-app'), { loading: Loading });
const CustomerApp = dynamic(() => import('./reservations/customer-app'), { loading: Loading });
export default function Home() { const [mode, setMode] = useState<CustomerPortalMode | 'admin' | null>(null); useEffect(() => { const value = new URL(location.href).searchParams.get('customerMode'); setMode(value && ['home', 'login', 'register', 'account', 'settings', 'emailChange', 'accountDeletion', 'reservation', 'confirmedChange', 'change', 'cancellation'].includes(value) ? value as CustomerPortalMode : 'admin'); }, []); return mode === null ? <Loading /> : mode === 'admin' ? <AdminApp /> : <CustomerApp initialMode={mode}/>; }
