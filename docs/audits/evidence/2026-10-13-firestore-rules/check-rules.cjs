// Run only against the disposable emulator started with the merged rules file.
// This script cannot target production or the everyday port-8081 emulator.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const projectId = 'demo-apcs-rules-merge';
const host = 'http://127.0.0.1:8197';
const base = `${host}/v1/projects/${projectId}/databases/(default)/documents`;
const checks = [];

function token(uid, email, extra = {}) {
    const now = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
        aud: projectId, iss: `https://securetoken.google.com/${projectId}`,
        sub: uid, user_id: uid, iat: now, exp: now + 3600,
        ...(email ? { email } : {}), firebase: { sign_in_provider: 'custom' }, ...extra,
    })}.`;
}
const actors = {
    owner: 'owner',
    staff: token('staff', 'staff@example.test'),
    admin: token('admin', 'admin@example.test'),
    outsider: token('outsider', 'outsider@example.test'),
    noEmail: token('no-email'),
    jury: token('jury', 'jury@example.test', { role: 'jury', competitionCategory: 'Piano' }),
};
function value(input) {
    if (input === null) return { nullValue: null };
    if (typeof input === 'string') return { stringValue: input };
    if (typeof input === 'boolean') return { booleanValue: input };
    if (typeof input === 'number') return { integerValue: String(input) };
    if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
    return { mapValue: { fields: fields(input) } };
}
function fields(input) {
    return Object.fromEntries(Object.entries(input).map(([key, item]) => [key, value(item)]));
}
async function request(method, docPath, actor, data, suffix = '') {
    const response = await fetch(`${base}/${docPath}${suffix}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actors[actor]}` } : {}) },
        ...(data ? { body: JSON.stringify({ fields: fields(data) }) } : {}),
    });
    return { status: response.status, body: await response.text() };
}
async function seed(docPath, data = { marker: 'synthetic' }) {
    const response = await request('PATCH', docPath, 'owner', data);
    assert.equal(response.status, 200, `seed ${docPath}: ${response.body.slice(0, 300)}`);
}
async function check(label, method, docPath, actor, allowed, data) {
    const response = await request(method, docPath, actor, data);
    assert.equal(response.status, allowed ? 200 : 403,
        `${label}: ${response.status} ${response.body.slice(0, 350)}`);
    checks.push(label);
}
async function queryCheck(label, collection, actor, allowed) {
    const response = await fetch(`${base}:runQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json',
            ...(actor ? { Authorization: `Bearer ${actors[actor]}` } : {}) },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }] } }),
    });
    assert.equal(response.status, allowed ? 200 : 403, `${label}: ${await response.text()}`);
    checks.push(label);
}

(async () => {
    await seed('whitelist/staff@example.test');
    await seed('users/staff', { role: 'subadmin' });
    // Non-whitelisted admin must not bypass backend-only writes via isAdmin().
    await seed('users/admin', { role: 'admin' });
    await seed('users/jury', { role: 'jury' });
    for (const collection of ['whitelist', 'Registration2025Fee', 'diamondAchiever', 'videos', 'homeVideos', 'users', 'events']) {
        await seed(`${collection}/public-read`);
        await check(`anonymous public read: ${collection}`, 'GET', `${collection}/public-read`, null, true);
        await queryCheck(`anonymous public list: ${collection}`, collection, null, true);
    }
    for (const docPath of [
        'competitionSessionPlans/plan', 'competitionSessionPlans/plan/groups/group',
        'ticketPaymentReceipts/receipt', 'ticketRedemptions/state',
        'ticketRedemptions/state/claims/claim', 'ticketRedemptions/state/requests/replay',
    ]) {
        await seed(docPath);
        await check(`staff protected read: ${docPath}`, 'GET', docPath, 'staff', true);
        await check(`outsider protected read denied: ${docPath}`, 'GET', docPath, 'outsider', false);
        for (const actor of ['staff', 'admin', 'outsider', null]) {
            await check(`${actor || 'anonymous'} protected create denied: ${docPath}`, 'PATCH', `${docPath}-new`, actor, false, { marker: 'create' });
            await check(`${actor || 'anonymous'} protected update denied: ${docPath}`, 'PATCH', docPath, actor, false, { marker: 'update' });
            await check(`${actor || 'anonymous'} protected delete denied: ${docPath}`, 'DELETE', docPath, actor, false);
        }
        await check(`backend bypass write: ${docPath}`, 'PATCH', docPath, 'owner', true, { marker: 'backend' });
    }
    await seed('scoringResultEmailDeliveries/delivery');
    for (const actor of ['staff', 'admin', 'outsider', null]) {
        await check(`${actor || 'anonymous'} delivery read denied`, 'GET', 'scoringResultEmailDeliveries/delivery', actor, false);
        await check(`${actor || 'anonymous'} delivery update denied`, 'PATCH', 'scoringResultEmailDeliveries/delivery', actor, false, { status: 'sent' });
    }
    for (const collection of ['publicBookings', 'seatsAPCS2026', 'ticketSeatOwnership', 'ticketCapacity',
        'ticketCheckoutKeys', 'winnerOrchestraClaims', 'orchestraAssignments', 'systemSettings',
        'Registrants2025', 'JuryScores2025', 'seatBook2025', 'users', 'whitelist', 'videos', 'homeVideos']) {
        const docPath = `${collection}/compatibility`;
        await check(`staff compatibility create: ${collection}`, 'PATCH', docPath, 'staff', true, { marker: 'original' });
        await check(`staff compatibility read: ${collection}`, 'GET', docPath, 'staff', true);
        await queryCheck(`staff compatibility list: ${collection}`, collection, 'staff', true);
        await check(`staff compatibility update: ${collection}`, 'PATCH', docPath, 'staff', true, { marker: 'updated' });
        await check(`staff compatibility delete: ${collection}`, 'DELETE', docPath, 'staff', true);
        await check(`anonymous write denied: ${collection}`, 'PATCH', docPath, null, false, { role: 'admin' });
        await check(`outsider write denied: ${collection}`, 'PATCH', docPath, 'outsider', false, { role: 'admin' });
    }
    await check('signed-in actor without email cannot use fallback', 'PATCH', 'publicBookings/no-email', 'noEmail', false, { paymentStatus: 'PAID' });
    await queryCheck('anonymous booking list denied', 'publicBookings', null, false);
    await queryCheck('outsider booking list denied', 'publicBookings', 'outsider', false);

    const planned = { competitionScheduleState: { status: 'ready' }, venues: [], orchestraSessions: [], masterclassSessions: [], title: 'original' };
    await seed('events/planned', planned);
    await check('staff can edit unrelated planned-event fields', 'PATCH', 'events/planned', 'staff', true, { ...planned, title: 'updated' });
    for (const field of ['competitionScheduleState', 'venues', 'orchestraSessions', 'masterclassSessions']) {
        await check(`planned-event ${field} edit denied`, 'PATCH', 'events/planned', 'staff', false,
            { ...planned, title: 'updated', [field]: field === 'competitionScheduleState' ? { status: 'draft' } : [{ id: 'changed' }] });
    }
    await check('removing planning state denied', 'PATCH', 'events/planned', 'staff', false, { venues: [] });
    await check('deleting planned event denied', 'DELETE', 'events/planned', 'staff', false);
    await check('client cannot create planning-state event', 'PATCH', 'events/new-plan', 'staff', false, planned);
    await check('staff can create legacy event', 'PATCH', 'events/legacy', 'staff', true, { venues: [] });
    await check('staff can edit legacy venues', 'PATCH', 'events/legacy', 'staff', true, { venues: [{ id: 'legacy' }] });
    await check('staff cannot introduce planning state on legacy event', 'PATCH', 'events/legacy', 'staff', false, planned);
    await seed('sessionAssignments/planned');
    await check('staff can read planned assignments', 'GET', 'sessionAssignments/planned', 'staff', true);
    await check('client planned assignment create denied', 'PATCH', 'sessionAssignments/new-plan', 'staff', false, { assignments: {} });
    await check('client planned assignment update denied', 'PATCH', 'sessionAssignments/planned', 'staff', false, { assignments: {} });
    await check('client planned assignment delete denied', 'DELETE', 'sessionAssignments/planned', 'staff', false);
    await check('legacy assignment write retained', 'PATCH', 'sessionAssignments/legacy', 'staff', true, { assignments: {} });
    await check('legacy assignment delete retained', 'DELETE', 'sessionAssignments/legacy', 'staff', true);
    await check('legacy event delete retained', 'DELETE', 'events/legacy', 'staff', true);

    await seed('Registrants2025/piano', { competitionCategory: 'Piano' });
    await seed('Registrants2025/violin', { competitionCategory: 'Violin' });
    await check('jury category read retained', 'GET', 'Registrants2025/piano', 'jury', true);
    await check('jury other-category read denied', 'GET', 'Registrants2025/violin', 'jury', false);
    await check('jury own score create retained', 'PATCH', 'JuryScores2025/own', 'jury', true, { juryUserId: 'jury' });
    await check('jury own score read retained', 'GET', 'JuryScores2025/own', 'jury', true);
    await check('jury own score update retained', 'PATCH', 'JuryScores2025/own', 'jury', true, { juryUserId: 'jury', score: 90 });
    await check('jury score ownership swap denied', 'PATCH', 'JuryScores2025/own', 'jury', false, { juryUserId: 'outsider' });
    await check('jury own score delete denied', 'DELETE', 'JuryScores2025/own', 'jury', false);
    await seed('JuryScores2025/other', { juryUserId: 'outsider' });
    await check('jury other score read denied', 'GET', 'JuryScores2025/other', 'jury', false);
    await check('admin score write retained', 'PATCH', 'JuryScores2025/other', 'admin', true, { juryUserId: 'outsider', score: 95 });
    const result = { date: '2026-10-13', projectId, host, syntheticDataOnly: true,
        rulesFile: 'docs/FIRESTORE_PRODUCTION_MERGED_2026-10-13.rules', passed: checks.length, checks };
    fs.writeFileSync(path.join(__dirname, 'results.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ passed: checks.length, projectId, syntheticDataOnly: true }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
