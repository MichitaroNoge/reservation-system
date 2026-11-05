import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { createCalendarFixture } from './calendar-fixture';
import { getDatabase } from '../../lib/db/client';
import * as schema from '../../lib/db/schema';
import { reservationFilters, reservationSortKeys, matchesReservation, compareReservations, type ReservationSearch } from '../../lib/reservation-search';
import { earliestReservationDate } from '../../lib/reservation-lead-time';
import { readAdminScreen } from '../../lib/admin-screen';
import { POST as pageAPI } from '../../app/api/admin/reservations/route';
import { GET as calendarAPI } from '../../app/api/admin/calendar/route';
import { GET as detailAPI } from '../../app/api/reservations/[id]/route';
import { POST as createAPI } from '../../app/api/reservations/route';
import { cancellationPolicyVersion } from '../../lib/cancellation-policy-consent';
import { PATCH as approve } from '../../app/api/reservations/[id]/status/route';
import { submit } from '../../lib/inquiries/controllers';
import { InquiryRepository } from '../../lib/inquiries/repository';
import { ResendEmailClient } from '../../lib/email/resend-email-client';
import { dispatchQueuedMail, enqueueMail, mailJobKey, type MailJobTarget } from '../../lib/mail-dispatch';
import { verifyOptionalFirebaseUser, requireVerifiedFirebaseUser } from '../../lib/auth';
const req = (path: string, body?: object, token = 'calendar-test-admin') => new Request('http://localhost:3000' + path, { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost:3000', ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
const base = { name: '検証', email: 'owner@example.test', phone: '09012345678', date: '2099-11-15', startTime: '12:00', people: 12, menuItems: ['検証メニュー'], status: 'confirmed' as const };
const query: ReservationSearch = { search: '', dateFrom: '', dateTo: '', statuses: [], filter: 'すべて', sortKey: 'date', direction: 'asc' };
test('read APIs page before loading details and preserve every filter, natural sort, counts and ownership', { timeout: 120000 }, async () => {
    const f = await createCalendarFixture();
    try {
        await f.repo.createAccount({ firebaseUid: 'calendar-test-user', name: '本人', contact: base.email, phone: base.phone });
        await f.repo.createAccount({ firebaseUid: 'other', name: '他人', contact: 'other@example.test', phone: base.phone });
        for (let i = 0; i < 61; i++) {
            await f.repo.createReservation({ ...base, name: ['あ2', 'あ10', '山田', 'A'][i % 4] + i, date: i < 10 ? earliestReservationDate(0) : i < 20 ? earliestReservationDate(1) : base.date, people: i + 1, status: (['temporary_requested', 'temporary_confirmed', 'confirmed_requested', 'confirmed', 'waiting_for_visit', 'cancelled'] as const)[i % 6], remarks: '詳細のみ'.repeat(200), accountFirebaseUid: i === 0 ? 'calendar-test-user' : i === 1 ? 'other' : undefined });
        }
        await f.repo.createMenu({ name: '昼10', description: '', price: 1000, duration: '45分', displayOrder: 2 });
        await f.repo.createMenu({ name: '昼2', description: '', price: 1000, duration: '45分', displayOrder: 3 });
        await f.repo.createStore({ name: '店舗2', displayOrder: 2 });
        const initial = await f.repo.listReservations();
        for (let i = 0; i < initial.length; i++) {
            const r = initial[i];
            if (['confirmed', 'waiting_for_visit'].includes(r.status)) {
                await f.repo.updateReservation(r.id, { menuItems: i % 3 === 0 ? [] : i % 3 === 1 ? ['昼10', '昼2', '昼2'] : ['昼2', '昼10'] });
                if (i % 2)
                    await f.repo.assignStores(r.id, [{ store: i % 3 ? '検証店舗' : '店舗2', people: r.people }]);
                if (i % 5 === 0)
                    await f.repo.updateConfirmationContact(r.id, new Date().toISOString());
            }
        }
        const rows = await f.repo.listReservations(), today = earliestReservationDate(0);
        for (const filter of reservationFilters) {
            const q = { ...query, filter };
            const expected = rows.filter(r => matchesReservation(r, q, today)).sort((a, b) => compareReservations(a, b, q, today));
            const result = await f.repo.reservationPage(q, 1, 100, today);
            assert.deepEqual(result.reservations.map(r => r.id), expected.map(r => r.id), 'filter ' + filter);
            assert.equal(result.total, expected.length);
        }
        for (const sortKey of reservationSortKeys)
            for (const direction of ['asc', 'desc'] as const) {
                const q = { ...query, sortKey, direction };
                const expected = [...rows].sort((a, b) => compareReservations(a, b, q, today));
                const result = await f.repo.reservationPage(q, 2, 17, today);
                assert.deepEqual(result.reservations.map(r => r.id), expected.slice(17, 34).map(r => r.id), 'sort ' + sortKey + direction);
            }
        for (const extra of [{ search: 'あ2' }, { search: '_%' }, { dateFrom: '2099-12-01', dateTo: '2099-11-01' }, { statuses: ['confirmed', 'temporary_confirmed'] as ReservationSearch['statuses'] }, { search: 'owner@example.test', filter: '本予約確定' as const }]) {
            const q = { ...query, ...extra };
            const result = await f.repo.reservationPage(q, 1, 100, today);
            assert.deepEqual(result.reservations.map(r => r.id), rows.filter(r => matchesReservation(r, q, today)).sort((a, b) => compareReservations(a, b, q, today)).map(r => r.id));
        }
        const response = await pageAPI(req('/api/admin/reservations', { ...query, page: 1, pageSize: 50 }));
        assert.equal(response.status, 200);
        const paged = await response.json();
        assert.equal(paged.reservations.length, 50);
        assert.equal(paged.total, 61);
        assert.ok(paged.reservations.every((r: {
            remarks?: string;
            policyConsents: unknown[];
        }) => !r.remarks && !r.policyConsents.length));
        assert.equal((await pageAPI(req('/api/admin/reservations', { ...query, page: 1, pageSize: 101 }))).status, 400);
        assert.equal((await pageAPI(req('/api/admin/reservations', { ...query, page: 1, pageSize: 50 }, ''))).status, 401);
        assert.equal((await pageAPI(req('/api/admin/reservations', { ...query, page: 1, pageSize: 50 }, 'calendar-test-member'))).status, 403);
        const detail = await detailAPI(req('/api/reservations/' + rows[0].id), { params: Promise.resolve({ id: rows[0].id }) });
        assert.equal((await detail.json()).reservation.remarks, rows[0].remarks);
        const dashboard = await readAdminScreen('dashboard');
        assert.equal(dashboard.reservations.length, 10);
        assert.equal(dashboard.summary.today, 10);
        assert.equal((await readAdminScreen('customers')).reservations.length, 0);
        const owned = rows.find(r => r.accountId && r.customer === 'あ20')!;
        const foreign = rows.find(r => r.accountId && r.customer === 'あ101')!;
        await f.repo.updateReservationStatus(owned.id, "confirmed");
        await f.repo.updateReservationStatus(foreign.id, "confirmed");
        await f.repo.createReservationChangeRequest({ reservationId: owned.id, email: base.email, requestedDate: base.date, requestedStartTime: '13:00', requestedPeople: 2, requestedMenuItems: base.menuItems });
        await f.repo.createReservationChangeRequest({ reservationId: foreign.id, email: base.email, requestedDate: base.date, requestedStartTime: '13:00', requestedPeople: 2, requestedMenuItems: base.menuItems });
        assert.ok((await f.repo.listReservationChangeRequestsForAccount('calendar-test-user')).every(r => r.reservationId === owned.id));
    }
    finally {
        await f.close();
    }
});
test('calendar reads only overlapping periods including overnight and unknown times', async () => {
    const f = await createCalendarFixture(), db = await getDatabase();
    try {
        const old = await f.repo.createReservation({ ...base, date: '2099-11-14', startTime: '23:30', endTime: '01:00' });
        const inside = await f.repo.createReservation(base);
        await f.repo.createReservation({ ...base, date: '2099-12-01' });
        const unknown = await f.repo.createReservation({ ...base, date: '2099-11-14' });
        await db.update(schema.reservation).set({ usageTime: '', usageEndTime: null }).where(eq(schema.reservation.reservationCode, unknown.id));
        const response = await calendarAPI(req('/api/admin/calendar?from=2099-11-15&to=2099-11-15'));
        assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
        const data = await response.json();
        assert.deepEqual(data.reservations.map((r: {
            id: string;
        }) => r.id).sort(), [old.id, inside.id].sort());
        assert.equal((await calendarAPI(req('/api/admin/calendar?from=2099-11-15&from=2099-11-16&to=2099-11-17'))).status, 400);
        assert.equal((await calendarAPI(req('/api/admin/calendar?from=2099-11-31&to=2099-12-01'))).status, 400);
        assert.equal((await calendarAPI(req('/api/admin/calendar?from=2099-11-15&to=2099-11-15', undefined, 'calendar-test-member'))).status, 403);
    }
    finally {
        await f.close();
    }
});
test('new requests return while mail is pending and durable jobs survive retries without duplicate dispatch', async () => {
    const f = await createCalendarFixture(), db = await getDatabase();
    const send = mock.method(ResendEmailClient.prototype, 'send', async () => new Promise<{
        id: string;
    }>(() => { }));
    try {
        await f.repo.createAccount({ firebaseUid: 'calendar-test-user', name: '本人', contact: base.email, phone: base.phone });
        const before = performance.now();
        const submitted = await submit(req('/api/inquiries', { name: '本人', email: base.email, category: 'other', subject: '質問', body: '本文', requestKey: randomUUID() }, 'calendar-test-member'));
        assert.equal(submitted.status, 201);
        assert.equal(send.mock.callCount(), 0);
        assert.ok(performance.now() - before < 1500);
        const accepted = await submitted.json();
        assert.equal((await new InquiryRepository(db).detail(accepted.number)).inquiry.receiptEmailStatus, 'pending');
        await dispatchQueuedMail(f.repo, db, async () => { throw Error('synthetic'); });
        const [job] = await db.select().from(schema.transactionalMailJob);
        assert.equal(job.attempts, 1);
        assert.equal(job.status, 'queued');
        assert.ok(Date.parse(job.availableAt) > Date.now());
        await db.update(schema.transactionalMailJob).set({ availableAt: new Date(0).toISOString() });
        const seen: MailJobTarget[] = [];
        await Promise.all([dispatchQueuedMail(f.repo, db, async (target) => { seen.push(target); }), dispatchQueuedMail(f.repo, db, async (target) => { seen.push(target); })]);
        assert.equal(seen.length, 1);
        assert.equal((await db.select().from(schema.transactionalMailJob))[0].status, 'done');
        await dispatchQueuedMail(f.repo, db, async () => { throw Error('must not send'); });
        const createdResponse=await createAPI(req('/api/reservations',{...base,status:'confirmed_requested',cancellationPolicyAgreement:{accepted:true,version:cancellationPolicyVersion}},'calendar-test-member'));
        assert.equal(createdResponse.status,201,JSON.stringify(await createdResponse.clone().json()));
        const createdBody=await createdResponse.json();assert.equal(createdBody.receiptEmail.status,'pending');assert.equal(send.mock.callCount(),0);
        assert.ok((await db.select().from(schema.transactionalMailJob)).some(row=>row.key===mailJobKey({kind:'reservation_receipt',reservationId:createdBody.reservation.id})));
        const b = await f.repo.createReservation({ ...base, status: 'confirmed_requested' });
        assert.equal((await db.select().from(schema.approvalEmailDelivery)).length, 0);
        const approval = await approve(new Request('http://localhost:3000/api', { method: 'PATCH', headers: { authorization: 'Bearer calendar-test-admin', 'content-type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) }), { params: Promise.resolve({ id: b.id }) });
        assert.equal(approval.status, 200);
        assert.equal((await approval.json()).approvalEmail.status, 'pending');
        assert.equal(send.mock.callCount(), 0);
        assert.equal((await db.select().from(schema.approvalEmailDelivery)).length, 1);
        await enqueueMail(db, { kind: 'reservation_receipt', reservationId: b.id });
        const key = mailJobKey({ kind: 'reservation_receipt', reservationId: b.id });
        await db.update(schema.transactionalMailJob).set({ attempts: 5 }).where(eq(schema.transactionalMailJob.key, key));
        await dispatchQueuedMail(f.repo, db, async () => { throw Error('must not send expired job'); });
        assert.equal((await db.select().from(schema.transactionalMailJob).where(eq(schema.transactionalMailJob.key, key)))[0].status, 'failed');
        const request = req('/api', undefined, 'calendar-test-member');
        const auth = (await import('firebase-admin/auth')).getAuth();
        const authCalls = mock.method(auth, 'verifyIdToken', async () => ({ uid: 'calendar-test-user', email_verified: true } as never));
        await verifyOptionalFirebaseUser(request);
        await requireVerifiedFirebaseUser(request);
        assert.equal(authCalls.mock.callCount(), 1);
        authCalls.mock.restore();
    }
    finally {
        send.mock.restore();
        await f.close();
    }
});

test('mail jobs commit with the reservation, recover expired leases, and stop after their retry window',async()=>{
  const f=await createCalendarFixture(),db=await getDatabase();
  try {
    await assert.rejects(f.repo.withTransaction('mail-rollback',async repo=>{
      await repo.createReservation({...base,receiptEmailRequestedAt:new Date().toISOString()});
      throw new Error('isolated rollback');
    }),/isolated rollback/);
    assert.equal((await db.select().from(schema.transactionalMailJob)).length,0);
    assert.equal((await f.repo.listReservations()).length,0);
    const target:MailJobTarget={kind:'reservation_receipt',reservationId:'RSV-isolated'};
    await enqueueMail(db,target);const key=mailJobKey(target);
    await db.update(schema.transactionalMailJob).set({status:'processing',leaseToken:randomUUID(),leaseUntil:new Date(Date.now()+120000).toISOString()}).where(eq(schema.transactionalMailJob.key,key));
    let sends=0;await dispatchQueuedMail(f.repo,db,async()=>{sends++;});assert.equal(sends,0);
    await db.update(schema.transactionalMailJob).set({leaseUntil:new Date(0).toISOString()}).where(eq(schema.transactionalMailJob.key,key));
    await dispatchQueuedMail(f.repo,db,async()=>{sends++;});assert.equal(sends,1);
    await enqueueMail(db,target,true);await db.update(schema.transactionalMailJob).set({requestedAt:new Date(Date.now()-24*3600000).toISOString(),availableAt:new Date(0).toISOString()}).where(eq(schema.transactionalMailJob.key,key));
    await dispatchQueuedMail(f.repo,db,async()=>{sends++;});assert.equal(sends,1);assert.equal((await db.select().from(schema.transactionalMailJob))[0].status,'failed');
  } finally {await f.close();}
});

test('unanswered inquiry tasks and filters agree with automatically published or delivered answers', async () => {
    const f = await createCalendarFixture(), db = await getDatabase(), inquiries = new InquiryRepository(db);
    const { GET: screenAPI } = await import('../../app/api/admin/screen/route');
    const count = async () => (await readAdminScreen('dashboard')).summary.tasks.unansweredInquiries;
    const check = async (expected: number) => {
        assert.equal(await count(), expected);
        assert.equal((await inquiries.list({ keyword: '', status: 'unhandled', page: 1, pageSize: 20 })).total, expected);
    };
    try {
        await check(0);
        const create = (uid: string | null) => inquiries.create({ name: '検証', email: 'task@example.test', category: 'other', subject: '問い合わせ', body: '本文', requestKey: randomUUID() }, 'fixture', uid, null, []);
        const anonymous = await create(null), member = await create('calendar-test-user');
        const answer = async (number: string) => inquiries.prepareReply(number, { subject: '回答', body: '回答本文', requestKey: randomUUID(), revision: (await inquiries.detail(number)).inquiry.revision }, 'calendar-test-user', '管理者');
        await check(2);
        const reply = await answer(anonymous); await check(2);
        const claim = await inquiries.claimMail({number: anonymous, replyId: reply}, {from:'sender@example.test',replyTo:'',testRecipient:''});
        await check(2);
        await inquiries.finishMail({number: anonymous, replyId: reply}, claim!.token, {error:'unknown'}); await check(2);
        await inquiries.resolveReplyMail(anonymous, reply, 'not_sent', (await inquiries.detail(anonymous)).inquiry.revision, 'admin'); await check(1);
        const memberReply = await answer(member); await check(0);
        const memberClaim = await inquiries.claimMail({number: member, replyId: memberReply}, {from:'sender@example.test',replyTo:'',testRecipient:''});
        await inquiries.finishMail({number: member, replyId: memberReply}, memberClaim!.token, {error:'failed'}); await check(0);
        assert.equal((await inquiries.detail(member, 'calendar-test-user')).inquiry.status, 'answered');
        const additional = await answer(anonymous); await check(1);
        const additionalClaim = await inquiries.claimMail({number: anonymous, replyId: additional}, {from:'sender@example.test',replyTo:'',testRecipient:''});
        await inquiries.finishMail({number: anonymous, replyId: additional}, additionalClaim!.token, {id:'fake-delivery'}); await check(0);
        const response = await screenAPI(req('/api/admin/screen?view=dashboard'));
        assert.equal(response.status,200); assert.match(response.headers.get('cache-control')??'',/no-store/);
        assert.equal((await response.json()).summary.tasks.unansweredInquiries,0);
        assert.equal((await screenAPI(req('/api/admin/screen?view=dashboard',undefined,''))).status,401);
        assert.equal((await screenAPI(req('/api/admin/screen?view=dashboard',undefined,'calendar-test-member'))).status,403);
    } finally { await f.close(); }
});

test('single-day inquiry calendar reads live occupancy, overnight reservations and blocks without changing reservations or sending mail', async () => {
 const f = await createCalendarFixture(), db = await getDatabase();
 const { calendarDay } = await import('../../lib/reservation-calendar');
 const send = mock.method(ResendEmailClient.prototype, 'send', async () => { throw Error('Viewing a calendar must not send mail'); });
 try {
  await f.repo.saveSystemSettings({ acceptanceCapacity: 100, reservationLeadDays: 3, blockedPeriods: [{ start: '2099-11-15T12:30', end: '2099-11-15T13:30', reason: '貸切' }] });
  const approved = await f.repo.createReservation({ ...base, people: 50, endTime: '13:00' });
  const temporary = await f.repo.createReservation({ ...base, people: 20, endTime: '13:00', status: 'temporary_confirmed' });
  const pending = await f.repo.createReservation({ ...base, people: 99, endTime: '13:00', status: 'confirmed_requested' });
  const overnight = await f.repo.createReservation({ ...base, date: '2099-11-14', startTime: '23:00', endTime: '01:00' });
  await f.repo.createReservation({ ...base, endTime: '13:00', status: 'cancelled' });
  await f.repo.createReservation({ ...base, endTime: '13:00', status: 'confirmed_rejected' });
  const before = await db.select().from(schema.reservation), mails = await db.select().from(schema.transactionalMailJob);
  const response = await calendarAPI(req('/api/admin/calendar?from=2099-11-15&to=2099-11-15'));
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  const data = await response.json();
  const day = calendarDay('2099-11-15', data.reservations, await f.repo.listMenus(), data.settings);
  assert.deepEqual(day.entries.map(e => e.reservation.id).sort(), [approved.id, temporary.id, pending.id, overnight.id].sort());
  assert.equal(day.entries.find(e => e.reservation.id === overnight.id)?.end, 60); assert.equal(day.peak, 50); assert.equal(day.combinedPeak, 70); assert.equal(day.blocks[0].reason, '貸切');
  const tomorrow = await (await calendarAPI(req('/api/admin/calendar?from=2099-11-16&to=2099-11-16'))).json();
  assert.equal(calendarDay('2099-11-16', tomorrow.reservations, [], tomorrow.settings).entries.length, 0);
  assert.deepEqual(await db.select().from(schema.reservation), before); assert.deepEqual(await db.select().from(schema.transactionalMailJob), mails); assert.equal(send.mock.callCount(), 0);
  const additional = await f.repo.createReservation({ ...base, endTime: '13:00', people: 4 });
  const latest = await (await calendarAPI(req('/api/admin/calendar?from=2099-11-15&to=2099-11-15'))).json();
  assert.ok(latest.reservations.some((r: { id: string }) => r.id === additional.id));
  assert.equal((await calendarAPI(req('/api/admin/calendar?from=2099-11-15&to=2099-11-15', undefined, ''))).status, 401);
  assert.equal((await calendarAPI(req('/api/admin/calendar?from=2099-11-15&to=2099-11-15', undefined, 'calendar-test-member'))).status, 403);
 } finally { send.mock.restore(); await f.close(); }
});
