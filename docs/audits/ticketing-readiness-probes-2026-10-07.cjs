// Read-only review probes: execute repository/controller source against memory only.
// No application initialization, credentials, browser, network, invoices or email.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const auditDir = path.join(root, 'apcs_service/audit');
const fixtureFile = path.join(auditDir, 'public-ticket.audit.cjs');
const original = fs.readFileSync(fixtureFile, 'utf8');
let fixtureSource = original.slice(0, original.indexOf('const paidInvoice ='));
fixtureSource = fixtureSource.replace('return { records, seed, timestamp', 'return { db, admin, records, seed, timestamp');
fixtureSource = fixtureSource.replace('const transaction = writer(true);', 'if (options.beforeTransaction) await options.beforeTransaction({ records, seed });\n        const transaction = writer(true);');
const fixtureContext = { require, __dirname: auditDir, module: { exports: {} } };
vm.runInNewContext(fixtureSource + '\nmodule.exports = fixture;', fixtureContext, { filename: fixtureFile });
const fixture = fixtureContext.module.exports;
const silent = { info() {}, warn() {}, error() {} };
const bookingFor = (f, id) => f.records.get(`publicBookings/${id}`);
function controller(f, relative, opts = {}) {
  const dependencies = {
    '../configs/firebase-init': { db: f.db, admin: f.admin },
    '../utils/Logger': { logger: silent }, '../utils/Logger.js': { logger: silent },
    '../services/PublicTicketService': {
      createPublicTicketBooking: req => new Promise((resolve, reject) => f.repo.createPublicTicketBooking(req.body, (err, data) => err ? reject(err) : resolve(data))),
      handlePublicTicketWebhookPaid: opts.failFulfillment ? async () => { throw new Error('Injected Firestore failure'); } : f.repo.handlePublicTicketWebhookPaid,
    },
    '../services/PublicTicketAdminReleaseService': {},
    '../repositories/PublicTicketRepository': f.repo,
    '../services/EmailService': {
      sendPublicBookingConfirmationEmail: async () => {},
      sendPublicSeatHoldEmail: async () => {},
      sendManualTicketPaymentInstructions: async () => { if (opts.failManualEmail) throw new Error('Injected SMTP failure'); },
    },
    '../services/PaperService.js': {},
    'express-validator': {}, '../utils/discountUtils': {},
  };
  const filename = path.join(root, relative);
  const ctx = { module: { exports: {} }, console: silent, require: name => {
    assert.ok(name in dependencies, `Unmocked controller dependency ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), ctx, { filename });
  return ctx.module.exports;
}
function response() {
  return { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
}
const invoicePayload = (id, total = 150000) => ({ invoice: { id: `invoice-${id}`, number: id, status: 'paid', total_amount: total } });
const results = [];
async function probe(name, run) {
  try { results.push({ name, observed: await run() }); }
  catch(error) { results.push({ name, probeError: error.message }); process.exitCode = 1; }
}
(async () => {
  await probe('Both paid callback controllers acknowledge failed fulfillment', async () => {
    const outputs = [];
    for (const [file, method] of [
      ['apcs_service/src/controllers/PublicTicketController.js', 'handlePublicTicketWebhook'],
      ['apcs_service/src/controllers/PaperController.js', 'handlePaperWebhook'],
    ]) {
      const f = fixture();
      const b = await f.book(); assert.ifError(b.error);
      const res = response();
      await controller(f, file, { failFulfillment: true })[method]({ body: invoicePayload(b.result.bookingId) }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(bookingFor(f, b.result.bookingId).paymentStatus, 'pending');
      outputs.push({ method, response: res.body, paymentStatus: 'pending', paymentDetailsSaved: !!bookingFor(f, b.result.bookingId).paymentDetails });
    }
    return outputs;
  });
  await probe('Paid callback arrives before local invoice ID persistence', async () => {
    let f, observed;
    f = fixture({ beforeInvoiceResponse: async ({ body }) => {
      const res = response();
      await controller(f, 'apcs_service/src/controllers/PublicTicketController.js').handlePublicTicketWebhook({ body: invoicePayload(body.externalId) }, res);
      observed = { http: res.statusCode, body: res.body, pendingBeforeInvoiceSave: bookingFor(f, body.externalId).paymentStatus };
    } });
    const b = await f.book(); assert.ifError(b.error);
    assert.equal(bookingFor(f, b.result.bookingId).paymentStatus, 'pending');
    return { ...observed, statusAfterInvoiceSave: bookingFor(f, b.result.bookingId).paymentStatus, invoiceIdEventuallySaved: bookingFor(f, b.result.bookingId).invoiceId };
  });
  await probe('Failed checkout with unknown invoice outcome rejects genuine later payment', async () => {
    const f = fixture({ invoiceFails: true });
    const b = await f.book(); assert.ok(b.error);
    await assert.rejects(f.repo.handlePublicTicketWebhookPaid('booking-1', invoicePayload('booking-1')), /checkout failed/);
    return { paymentStatus: bookingFor(f, 'booking-1').paymentStatus, cleanup: bookingFor(f, 'booking-1').checkoutFailure, laterPayment: 'rejected' };
  });
  await probe('No authentication is checked before matching callback marks PAID', async () => {
    const f = fixture(); const b = await f.book(); assert.ifError(b.error);
    const res = response();
    await controller(f, 'apcs_service/src/controllers/PublicTicketController.js').handlePublicTicketWebhook({ body: invoicePayload(b.result.bookingId), headers: {} }, res);
    assert.equal(bookingFor(f, b.result.bookingId).paymentStatus, 'PAID');
    return { headers: 'none', paymentStatus: bookingFor(f, b.result.bookingId).paymentStatus, http: res.statusCode };
  });
  await probe('An overlapping retry returns a booking before its invoice is available', async () => {
    let f, retry;
    f = fixture({ beforeInvoiceResponse: async () => { retry = await f.book({ idempotencyKey: 'overlap' }); } });
    const first = await f.book({ idempotencyKey: 'overlap' });
    assert.ifError(first.error); assert.ifError(retry.error);
    assert.equal(first.result.bookingId, retry.result.bookingId);
    assert.equal(retry.result.paymentUrl, null);
    return { sameBooking: true, invoiceCount: f.invoices.length, replayPaymentUrl: retry.result.paymentUrl, firstPaymentUrl: first.result.paymentUrl };
  });
  await probe('Pricing changes between initial read and checkout transaction are ignored', async () => {
    let once = false;
    const f = fixture({ beforeTransaction: ({ records }) => {
      if (once) return; once = true;
      records.get('events/APCS2026').ticketTiers[0].venuePrices.V1 = 250000;
    } });
    const b = await f.book(); assert.ifError(b.error);
    assert.equal(bookingFor(f, b.result.bookingId).totalAmount, 150000);
    return { currentPrice: 250000, storedTotal: bookingFor(f, b.result.bookingId).totalAmount, invoiceTotal: f.invoices[0].items[0].price };
  });
  await probe('Closing eligibility before the transaction does not stop the checkout', async () => {
    let once = false;
    const f = fixture({ beforeTransaction: ({ seed }) => {
      if (once) return; once = true;
      seed('systemSettings/global', { currentEventId: 'APCS2026', ticketEligibility: { enabled: true, schedule: [] } });
    } });
    const b = await f.book(); assert.ifError(b.error);
    return { currentEligibility: 'enabled with no sale days', accepted: !!b.result, paymentStatus: bookingFor(f, b.result.bookingId).paymentStatus };
  });
  await probe('Manual-payment email failure returns an error after reservation', async () => {
    const f = fixture(); const res = response();
    await controller(f, 'apcs_service/src/controllers/PublicTicketController.js', { failManualEmail: true }).createPublicTicketBooking({ body: f.body({ manualPayment: true, bookingType: 'public_competition', registrantId: 'winner' }) }, res, error => { throw error; });
    assert.equal(res.statusCode, 503);
    assert.equal(bookingFor(f, res.body.bookingId).paymentStatus, 'pending');
    return { http: res.statusCode, persistedBookingId: res.body.bookingId, paymentStatus: 'pending', automaticExpiry: bookingFor(f, res.body.bookingId).lockExpiresAt };
  });
  await probe('Seat regeneration can overwrite a new checkout lock', async () => {
    const f = fixture();
    const seatId = 'V1-presto-A1_APCS2026_2026-11-01_09:00-10:00';
    f.seat(seatId);
    let b;
    const file = path.join(root, 'apcs_web/src/Pages/AdminDashboard/SeatEvent.js');
    const src = fs.readFileSync(file, 'utf8');
    const start = src.indexOf('export const uploadFullSeatLayout =');
    const end = src.indexOf('const SeatingEvent =', start);
    const ctx = {
      console: { log() {}, error() {} }, db: f.db,
      doc: (_db, collection, id) => ({ path: `${collection}/${id}` }),
      getDoc: async ref => ({ exists: () => f.records.has(ref.path), data: () => structuredClone(f.records.get(ref.path)) }),
      collection: (_db, name) => ({ name }), where: (...args) => args,
      query: (collection, ...filters) => ({ collection, filters }),
      getDocs: async () => {
        const data = structuredClone(f.records.get(`seatsAPCS2026/${seatId}`));
        return { forEach: callback => callback({ id: seatId, data: () => data }) };
      },
      writeBatch: () => {
        const operations = [];
        return {
          set: (ref, data) => operations.push([ref.path, data]),
          commit: async () => {
            if (!b) { b = await f.book({ selectedSeatIds: [seatId], addOnIds: ['seat_selection_performer'] }); assert.ifError(b.error); }
            for (const [key, data] of operations) f.seed(key, data);
          },
        };
      },
      updateDoc: async () => {},
    };
    vm.runInNewContext(src.slice(start, end).replace('export const', 'const') + '\nglobalThis.generate = uploadFullSeatLayout;', ctx, { filename: file });
    await ctx.generate('APCS2026', 'V1', ['2026-11-01_09:00-10:00']);
    assert.equal(f.records.get(`seatsAPCS2026/${seatId}`).status, 'available');
    await assert.rejects(f.repo.handlePublicTicketWebhookPaid(b.result.bookingId, invoicePayload(b.result.bookingId, 160000)), /no longer owns every selected seat/);
    return { seatStatusAfterGeneration: 'available', bookingStatus: bookingFor(f, b.result.bookingId).paymentStatus, paidFulfillment: 'rejected' };
  });
  await probe('Legacy reservations bypass the public capacity ledger', async () => {
    const f = fixture(); f.seat('legacy-seat');
    f.db.getAll = (...refs) => Promise.all(refs.map(ref => ref.get()));
    const b = await f.book({ tickets: [{ id: 'presto', quantity: 10 }] }); assert.ifError(b.error);
    f.seed('seatBook2025/legacy', { userId: 'legacy-user', userName: 'Legacy Buyer', userEmail: 'legacy@example.invalid', seatsSelected: false });
    const file = path.join(root, 'apcs_service/src/repositories/TicketRepository.js');
    const ctx = { module: { exports: {} }, process: { env: {} }, console: { log() {}, error() {} }, require: name => {
      if (name.endsWith('DbConfig')) return {};
      if (name.endsWith('Logger')) return { logger: silent };
      if (name.endsWith('firebase-init')) return { db: f.db, admin: f.admin };
      if (name === 'jsonwebtoken') return {};
      if (name.endsWith('EmailService.js')) return { sendEmailConfirmSeatSelectionFunc: async () => {} };
      throw new Error(`Unmocked legacy dependency ${name}`);
    } };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
    await ctx.module.exports.confirmSeatSelection({ eventId: 'APCS2026', bookingId: 'legacy', selectedSeatIds: ['legacy-seat'] });
    await f.repo.handlePublicTicketWebhookPaid(b.result.bookingId, invoicePayload(b.result.bookingId, 1500000));
    assert.equal(f.records.get('seatsAPCS2026/legacy-seat').status, 'reserved');
    return { configuredPrestoCapacity: 10, paidPublicTickets: 10, additionalLegacyReservedSeats: 1, totalDemand: 11 };
  });
  await probe('Competition payment does not guarantee the promised orchestra capacity', async () => {
    const f = fixture(); f.records.get('events/APCS2026').orchestraSessions[0].complimentaryQuota = 1;
    const b = await f.book({ registrantId: 'winner', tickets: [{ id: 'presto', quantity: 2 }] }); assert.ifError(b.error);
    await f.repo.handlePublicTicketWebhookPaid(b.result.bookingId, invoicePayload(b.result.bookingId, 300000));
    const assignment = f.load('src/repositories/OrchestraAssignmentRepository.js');
    await assert.rejects(assignment.assignGroup({ eventId: 'APCS2026', registrantId: 'winner', sessionId: 'orch' }, { email: 'staff@example.invalid' }), /whole group exceeds/);
    return { bookingStatus: bookingFor(f, b.result.bookingId).paymentStatus, promisedGroupQuantity: 3, onlySessionQuota: 1, orchestraAssignment: 'rejected after payment' };
  });
  console.log(JSON.stringify(results, null, 2));
})();
