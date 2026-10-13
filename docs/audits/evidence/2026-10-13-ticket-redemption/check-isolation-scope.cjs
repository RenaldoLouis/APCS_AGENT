// Read-only source comparison against the nested repositories' HEAD snapshots.
// This records this review's scope; it is not a permanently fixed test baseline.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const web = path.join(root, 'apcs_web');
const service = path.join(root, 'apcs_service');
const webRequire = createRequire(path.join(web, 'package.json'));
const { parse } = webRequire('@babel/parser');
const before = (repo, file) => execFileSync('git', ['show', `HEAD:${file}`], { cwd: repo, encoding: 'utf8' });
const current = (repo, file) => fs.readFileSync(path.join(repo, file), 'utf8');
const clean = value => Array.isArray(value) ? value.map(clean) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !['loc', 'start', 'end', 'trailingComma', 'parenStart', 'leadingComments', 'trailingComments', 'innerComments', 'comments'].includes(key))
        .map(([key, item]) => [key, clean(item)])) : value;
const ast = value => parse(value, { sourceType: 'unambiguous', plugins: ['jsx'] });
const apiAst = ast(current(web, 'src/apis/index.js'));
const apiExport = apiAst.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration;
const ticketApi = apiExport.properties.find(property => property.key.name === 'publicTicket').value;
ticketApi.properties = ticketApi.properties.filter(property => property.key.name !== 'redemption');
assert.deepEqual(clean(apiAst), clean(ast(before(web, 'src/apis/index.js'))));
const routes = value => ast(value).program.body.filter(node => node.type === 'ExpressionStatement' &&
    node.expression.type === 'CallExpression' && node.expression.callee.object?.name === 'router' &&
    ['get', 'post', 'put', 'patch', 'delete'].includes(node.expression.callee.property.name) &&
    !node.expression.arguments[0]?.value?.startsWith('/public-ticket/admin/redemption/'));
assert.deepEqual(clean(routes(current(service, 'src/routes/PaymentRoute.js'))), clean(routes(before(service, 'src/routes/PaymentRoute.js'))));
const coreFiles = [
    'src/repositories/PublicTicketRepository.js', 'src/repositories/PublicTicketFailureRepository.js',
    'src/repositories/PublicTicketPaymentReceiptRepository.js', 'src/repositories/TicketSeatAdminRepository.js',
    'src/services/PublicTicketPaymentService.js', 'src/services/PublicTicketService.js',
    'src/services/EmailService.js', 'src/services/OrchestraEmailDetails.js',
    'src/controllers/PublicTicketController.js', 'src/controllers/PaperController.js',
    'src/jobs/PublicTicketSweeper.js', 'src/jobs/PublicTicketPaymentRecoveryJob.js',
];
for (const file of coreFiles) assert.equal(current(service, file), before(service, file), `${file} changed`);
const rules = current(web, 'firestore.rules').replace(/    \/\/ Ticket handover counters[^\n]*\n    match \/ticketRedemptions\/\{document=\*\*\} \{\n      allow read: if isWhitelisted\(\);\n      allow write: if false;\n    \}\n/, '')
    .replace("        && collection != 'ticketRedemptions'\n", '');
assert.equal(rules, before(web, 'firestore.rules'));
console.log(JSON.stringify({ passed: 4, coreFilesUnchanged: coreFiles.length,
    baselines: { frontend: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: web, encoding: 'utf8' }).trim(),
        backend: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: service, encoding: 'utf8' }).trim() }, checks: [
    'Every pre-existing frontend API method/helper is unchanged; only the redemption method was added.',
    'All pre-existing payment-router endpoint registrations and handlers are unchanged.',
    'Checkout, pricing/fulfillment, receipt recovery, seat administration and email/job modules match HEAD exactly.',
    'Existing collection permissions are unchanged; only ticketRedemptions and its fallback exclusion were added.',
] }, null, 2));
