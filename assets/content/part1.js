/* Stops 1-3: JavaScript essentials, script anatomy, N/record */
window.COURSE_MODULES = window.COURSE_MODULES || [];

window.COURSE_DICTIONARY = [
  { id: 'custentity_hs_delivery_zone', on: 'Customer', type: 'List', desc: 'Delivery zone: North, South, East, City' },
  { id: 'custentity_hs_min_order', on: 'Customer', type: 'Currency', desc: 'Minimum order value for free delivery' },
  { id: 'custbody_hs_delivery_date', on: 'Sales Order', type: 'Date', desc: 'Requested delivery day' },
  { id: 'custbody_hs_route', on: 'Sales Order', type: 'List', desc: 'Route the van runs (R1 to R4)' },
  { id: 'custbody_hs_driver', on: 'Sales Order, Fulfillment', type: 'Employee', desc: 'Driver assigned to the stop' },
  { id: 'custitem_hs_case_pack', on: 'Item', type: 'Integer', desc: 'Units per case (orders go out in whole cases)' },
  { id: 'custitem_hs_chilled', on: 'Item', type: 'Checkbox', desc: 'Needs the refrigerated van' },
  { id: 'custbody_hs_pod_name', on: 'Item Fulfillment', type: 'Text', desc: 'Who signed for the delivery' },
  { id: 'custbody_hs_pod_time', on: 'Item Fulfillment', type: 'Date/Time', desc: 'When the delivery was signed for' },
  { id: 'custbody_hs_min_waived', on: 'Sales Order', type: 'Checkbox', desc: 'Order desk override for the minimum order rule' },
  { id: 'custbody_hs_invoiced', on: 'Item Fulfillment', type: 'Checkbox', desc: 'Set once the order has been billed' },
  { id: 'customrecord_hs_delivery_run', on: 'Custom record', type: 'Record', desc: 'One van run: date, route, driver, stop count' },
];

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm1',
  order: 1,
  title: 'JavaScript essentials for SuiteScript',
  summary: 'The parts of modern JavaScript you will use in every script: variables, objects, arrays, functions and safe money maths.',
  lesson: [
    { p: 'SuiteScript 2.1 is plain JavaScript (ES2019 and later) running inside NetSuite. NetSuite adds modules such as <code>N/record</code> and <code>N/search</code>, but the logic that decides <em>what</em> to do with an order is ordinary JavaScript. This stop covers the language features you will lean on most.' },
    { h: 'const and let' },
    { p: 'Use <code>const</code> for anything you will not reassign, which is most values. Use <code>let</code> for counters and running totals. Avoid <code>var</code>: it ignores block scope and causes bugs inside loops.' },
    { code: `
const customerId = 1482;          // never reassigned
let orderTotal = 0;               // changes as we add lines
orderTotal += 36.5;

// const stops reassignment, not mutation:
const order = { route: 'R2' };
order.route = 'R3';               // allowed
// order = {};                    // TypeError` },
    { h: 'Types you will meet' },
    { table: [
      ['Type', 'Example', 'Where it shows up'],
      ['string', "<code>'SO-10442'</code>", 'Internal IDs from select fields, text fields, search results'],
      ['number', '<code>24.95</code>', 'Currency, quantity, integer fields'],
      ['boolean', '<code>true</code>', 'Checkbox fields such as <code>custitem_hs_chilled</code>'],
      ['Date', '<code>new Date()</code>', 'Date fields like <code>custbody_hs_delivery_date</code>'],
      ['null / empty string', "<code>null</code>, <code>''</code>", 'Empty fields. Always check before using'],
      ['object', "<code>{ id: 7, zone: 'North' }</code>", 'Grouping data, script parameters, JSON payloads'],
      ['array', "<code>['R1', 'R2']</code>", 'Lists of lines, IDs, search filters'],
    ] },
    { note: 'A select field such as <code>entity</code> gives you an internal ID back from <code>getValue</code>, often as a string like <code>"1482"</code>. Compare it with <code>Number(id) === 1482</code> or keep both sides as strings.' },
    { h: 'Strict equality and truthiness' },
    { p: 'Always compare with <code>===</code> and <code>!==</code>. Loose <code>==</code> converts types and hides bugs. For "is this field filled in?" checks, rely on truthiness: <code>\'\'</code>, <code>0</code>, <code>null</code>, <code>undefined</code>, <code>NaN</code> and <code>false</code> are all falsy.' },
    { code: `
const route = salesOrder.getValue({ fieldId: 'custbody_hs_route' });
if (!route) {
  // empty string or null: no route chosen yet
}
if (status === 'pendingFulfillment') { /* strict compare */ }` },
    { h: 'Functions and arrow functions' },
    { p: 'Arrow functions are short and are the normal style for SuiteScript 2.1 entry points and callbacks. Default parameters and early returns keep business rules readable.' },
    { code: `
const caseRoundUp = (qty, casePack = 1) => Math.ceil(qty / casePack) * casePack;

caseRoundUp(14, 12); // 24: two full cases of oat milk

function isDeliveryDay(date) {
  const day = date.getDay();      // 0 = Sunday
  return day !== 0;               // vans run Mon-Sat
}` },
    { h: 'Objects, destructuring and template literals' },
    { code: `
const stop = { customer: 'Copper Kettle Café', zone: 'City', cases: 9 };
const { customer, zone } = stop;  // pull fields out by name

const msg = \`\${customer} (\${zone}) – \${stop.cases} cases\`;
// "Copper Kettle Café (City) – 9 cases"` },
    { h: 'Array methods' },
    { p: 'Most automations boil down to "go through these lines and work something out". These methods do that without manual index bookkeeping.' },
    { code: `
const lines = [
  { item: 'Espresso beans 1kg', qty: 6, rate: 18.5, chilled: false },
  { item: 'Whole milk 2L',      qty: 12, rate: 2.1,  chilled: true },
  { item: 'Paper cups 12oz',    qty: 2,  rate: 41,   chilled: false },
];

const chilled  = lines.filter((l) => l.chilled);              // only fridge items
const names    = lines.map((l) => l.item);                    // just the names
const total    = lines.reduce((sum, l) => sum + l.qty * l.rate, 0);
const needsVan = lines.some((l) => l.chilled);                // true
const cups     = lines.find((l) => l.item.includes('cups'));  // first match` },
    { h: 'Money maths' },
    { p: 'JavaScript numbers are floating point, so <code>0.1 + 0.2</code> is <code>0.30000000000000004</code>. Round currency to cents before comparing or saving.' },
    { code: `
const round2 = (n) => Math.round(n * 100) / 100;
round2(0.1 + 0.2);       // 0.3
(39.999).toFixed(2);     // "40.00" (a string, for display)` },
    { h: 'try / catch' },
    { p: 'Anything that touches NetSuite can throw: a record is locked, a field ID is misspelled, a user lacks permission. Wrap risky work, log the error, and decide whether to stop or carry on.' },
    { code: `
try {
  processOrder(orderId);
} catch (e) {
  log.error({ title: \`Order \${orderId} failed\`, details: e.message });
}` },
  ],
  cards: [
    { q: 'When should you use <code>const</code> rather than <code>let</code>?', a: 'Whenever the variable is never reassigned. Objects and arrays declared with <code>const</code> can still have their contents changed.' },
    { q: 'Why avoid <code>==</code> in business rules?', a: 'It converts types before comparing (<code>"0" == 0</code> is true), which hides bugs. Use <code>===</code>.' },
    { q: 'Name the six falsy values.', a: "<code>false</code>, <code>0</code>, <code>''</code>, <code>null</code>, <code>undefined</code>, <code>NaN</code>. (Also <code>-0</code> and <code>0n</code>.)" },
    { q: 'Which array method returns a <em>single</em> value built up from every element?', a: '<code>reduce</code>, e.g. summing line amounts: <code>lines.reduce((s, l) => s + l.amount, 0)</code>.' },
    { q: 'Difference between <code>filter</code> and <code>find</code>?', a: '<code>filter</code> returns a new array of every match. <code>find</code> returns the first matching element, or <code>undefined</code>.' },
    { q: 'How do you safely round a currency amount to cents?', a: '<code>Math.round(n * 100) / 100</code>. Use <code>toFixed(2)</code> only for display, because it returns a string.' },
    { q: 'What does <code>Math.ceil(14 / 12) * 12</code> give, and why is that useful here?', a: '24. It rounds an order quantity up to whole cases when an item ships in cases of 12.' },
    { q: 'What does <code>new Date().getDay()</code> return for a Sunday?', a: '<code>0</code>. Monday is 1, Saturday is 6.' },
    { q: 'Write a template literal that prints "Route R2: 14 stops" from <code>route</code> and <code>count</code>.', a: '<code>`Route ${route}: ${count} stops`</code>' },
  ],
  quiz: [
    { q: 'A select field returns <code>"1482"</code>. Which check is reliable?', options: ['<code>id == 1482</code>', '<code>Number(id) === 1482</code>', '<code>id === 1482</code>', '<code>id.equals(1482)</code>'], answer: 1, why: 'Convert explicitly, then compare strictly. <code>id === 1482</code> is false because one side is a string; <code>==</code> works but hides type mistakes.' },
    { q: 'What does this return?', code: "[3, 0, 5].filter((q) => q).length", options: ['3', '2', '0', 'An error'], answer: 1, why: '<code>0</code> is falsy, so it is filtered out, leaving two elements.' },
    { q: 'Which expression totals <code>qty * rate</code> across all <code>lines</code>?', options: ['<code>lines.map((l) => l.qty * l.rate)</code>', '<code>lines.reduce((s, l) => s + l.qty * l.rate, 0)</code>', '<code>lines.forEach((l) => l.qty * l.rate)</code>', '<code>lines.find((l) => l.qty * l.rate)</code>'], answer: 1, why: '<code>reduce</code> carries a running sum. <code>map</code> gives an array of line totals, <code>forEach</code> returns undefined.' },
    { q: 'Why is <code>var</code> discouraged in SuiteScript 2.1?', options: ['NetSuite rejects it', 'It is function-scoped, so it leaks out of loops and blocks', 'It is slower', 'It cannot hold objects'], answer: 1, why: '<code>var</code> still works, but its function scope causes surprising bugs inside <code>for</code> loops and <code>if</code> blocks. <code>let</code> and <code>const</code> are block-scoped.' },
    { q: 'A customer orders 30 cups; they ship in sleeves of 50. Which gives the quantity to send?', options: ['<code>Math.floor(30 / 50) * 50</code>', '<code>Math.round(30 / 50)</code>', '<code>Math.ceil(30 / 50) * 50</code>', '<code>30 % 50</code>'], answer: 2, why: 'Round up to whole sleeves: <code>Math.ceil(0.6) * 50 = 50</code>.' },
    { q: 'What is <code>(19.995).toFixed(2)</code>\'s type?', options: ['number', 'string', 'boolean', 'Currency object'], answer: 1, why: '<code>toFixed</code> always returns a string. Convert back with <code>Number()</code> if you need to calculate with it.' },
  ],
  labs: [
    {
      title: 'Total an order and check the minimum',
      file: 'order_utils.js',
      scenario: 'Harbourside charges a delivery fee when an order is below the customer\'s minimum (<code>custentity_hs_min_order</code>). Finish the helper that totals the lines and reports whether the order qualifies for free delivery.',
      code: `
const round2 = (n) => Math.round(n * 100) / 100;

const meetsMinimum = (lines, minOrder) => {
  const total = lines.{{reduce}}((sum, line) => sum + line.qty * line.rate, {{0}});
  return round2(total) {{>=}} minOrder;
};

meetsMinimum([{ qty: 6, rate: 18.5 }, { qty: 2, rate: 41 }], 150); // true (193)`,
      hint: 'You need the array method that folds many values into one, and a starting value for the running sum. "At least the minimum" qualifies.',
      explain: '<code>reduce</code> starts the sum at <code>0</code> and adds each line\'s <code>qty * rate</code>. Rounding before the <code>&gt;=</code> comparison avoids float noise such as 149.99999999 failing a 150 minimum.',
    },
    {
      title: 'Pick the chilled lines',
      file: 'order_utils.js',
      scenario: 'Dispatch needs the names of items that must go on the refrigerated van.',
      code: `
const chilledItemNames = (lines) =>
  lines
    .{{filter}}((line) => line.chilled {{===}} true)
    .{{map}}((line) => line.item);`,
      hint: 'First keep only matching lines, then turn each kept line into its name.',
      explain: '<code>filter</code> narrows the array to chilled lines; <code>map</code> transforms each one into just its <code>item</code> string. Chaining keeps it to one readable expression.',
    },
    {
      title: 'Build the driver\'s stop label',
      file: 'labels.js',
      scenario: 'Each stop on the van manifest reads like <code>Stop 3 · Copper Kettle Café · 9 cases</code>. Complete the function using destructuring and a template literal.',
      code: `
const stopLabel = (stop, position) => {
  const { {{customer}}, cases } = stop;
  return {{\`}}Stop \${position} · \${customer} · \${ {{cases}} } cases\`;
};`,
      hint: 'Destructure the property holding the customer name. A template literal opens with a backtick.',
      explain: 'Destructuring pulls <code>customer</code> and <code>cases</code> into variables. The backtick starts a template literal, and each <code>${...}</code> inserts a value.',
    },
  ],
});

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm2',
  order: 2,
  title: 'Anatomy of a SuiteScript file',
  summary: 'JSDoc tags, define(), N/ modules, entry points, deployments, field ID prefixes, governance and logging.',
  lesson: [
    { p: 'Every SuiteScript 2.x file follows the same shape. Once you can read the skeleton, any script type is just a different set of entry points.' },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], (record, log) => {

  const beforeSubmit = (context) => {
    log.debug({ title: 'Saving order', details: context.newRecord.id });
  };

  return { beforeSubmit };
});`, label: 'ue_hs_sales_order.js' },
    { h: 'The JSDoc header' },
    { list: [
      '<code>@NApiVersion 2.1</code> selects the modern JavaScript engine (arrow functions, <code>const</code>, template literals). <code>2.x</code> also exists; prefer 2.1 for new work.',
      '<code>@NScriptType</code> tells NetSuite which entry points to expect: <code>UserEventScript</code>, <code>ClientScript</code>, <code>ScheduledScript</code>, <code>MapReduceScript</code>, <code>Suitelet</code>, <code>Restlet</code>, <code>WorkflowActionScript</code> and others.',
      '<code>@NModuleScope SameAccount</code> limits which other scripts can load this file as a module. It is a sensible default.',
    ] },
    { h: 'define() and N/ modules' },
    { p: '<code>define</code> is the AMD loader. The first argument lists the modules you need; NetSuite passes them into the callback in the same order. The callback returns an object whose keys are the entry points.' },
    { table: [
      ['Module', 'Use it to'],
      ['<code>N/record</code>', 'Load, create, edit and transform records'],
      ['<code>N/search</code>', 'Run saved or ad-hoc searches, look up fields'],
      ['<code>N/query</code>', 'Run SuiteQL (SQL-style) queries'],
      ['<code>N/runtime</code>', 'Read script parameters, current user, remaining governance'],
      ['<code>N/email</code>', 'Send email from NetSuite'],
      ['<code>N/log</code>', 'Write to the script execution log'],
      ['<code>N/ui/serverWidget</code>', 'Build Suitelet pages and add fields to forms'],
      ['<code>N/task</code>', 'Queue scheduled and map/reduce scripts'],
      ['<code>N/format</code>', 'Convert dates and numbers to and from user format'],
      ['<code>N/currentRecord</code>, <code>N/ui/dialog</code>', 'Client-side record access and pop-ups'],
    ] },
    { h: 'Script record and deployment' },
    { p: 'Uploading the file is not enough. You create a <strong>Script</strong> record (ID like <code>customscript_hs_so_checks</code>) that points at the file and defines any parameters, then one or more <strong>Script Deployments</strong> (<code>customdeploy_hs_so_checks</code>) that say where it runs: which record type, which roles, status Testing or Released, log level, and who it executes as.' },
    { note: 'Deploy with status <strong>Testing</strong> first: it runs only for the script owner, so you can try a new Sales Order rule without affecting the order desk.', title: 'Deployment tip' },
    { h: 'Field and object ID prefixes' },
    { table: [
      ['Prefix', 'Belongs to', 'Example'],
      ['<code>custbody_</code>', 'Transaction body field', '<code>custbody_hs_delivery_date</code>'],
      ['<code>custcol_</code>', 'Transaction line (column) field', '<code>custcol_hs_substituted</code>'],
      ['<code>custentity_</code>', 'Entity field (customer, vendor, employee)', '<code>custentity_hs_delivery_zone</code>'],
      ['<code>custitem_</code>', 'Item field', '<code>custitem_hs_chilled</code>'],
      ['<code>customrecord_</code>', 'Custom record type', '<code>customrecord_hs_delivery_run</code>'],
      ['<code>custrecord_</code>', 'Field on a custom record', '<code>custrecord_hs_run_driver</code>'],
      ['<code>custscript_</code>', 'Script parameter', '<code>custscript_hs_cutoff_hour</code>'],
      ['<code>custpage_</code>', 'Field added by script to a page at runtime', '<code>custpage_hs_route_filter</code>'],
    ] },
    { h: 'Governance' },
    { p: 'NetSuite meters API calls in <strong>usage units</strong>. Each script type has a budget per execution; exceed it and the script is stopped with an error. Typical costs: loading a transaction 10 units, saving one 20, <code>search.lookupFields</code> 1, sending an email 20.' },
    { table: [
      ['Script type', 'Units per execution'],
      ['Client, User Event, Suitelet', '1,000'],
      ['RESTlet', '5,000'],
      ['Scheduled', '10,000'],
      ['Map/Reduce', 'Per stage: getInputData 10,000 · map 1,000 per call · reduce 5,000 per call · summarize 10,000'],
    ] },
    { code: `
const remaining = runtime.getCurrentScript().getRemainingUsage();
if (remaining < 200) {
  // stop cleanly and reschedule instead of being killed mid-update
}` },
    { h: 'Logging' },
    { p: '<code>N/log</code> has four levels: <code>debug</code>, <code>audit</code>, <code>error</code>, <code>emergency</code>. The deployment\'s log level decides which are kept. Leave chatty <code>debug</code> lines in place and raise the deployment to Audit or Error once released.' },
    { code: `
log.audit({ title: 'Route manifest built', details: \`R2: \${stops.length} stops\` });
log.error({ title: 'Fulfillment failed', details: e });` },
  ],
  cards: [
    { q: 'What does <code>@NApiVersion 2.1</code> give you over 2.0?', a: 'A newer JavaScript engine with ES2015+ features: arrow functions, <code>let</code>/<code>const</code>, template literals, destructuring, classes and more.' },
    { q: 'What must the <code>define</code> callback return?', a: 'An object mapping entry-point names to functions, e.g. <code>return { beforeSubmit, afterSubmit };</code>' },
    { q: 'Field ID prefix for a transaction <strong>line</strong> field?', a: '<code>custcol_</code>' },
    { q: 'Field ID prefix for a customer field?', a: '<code>custentity_</code> (entity fields cover customers, vendors, employees, partners).' },
    { q: 'What are <code>custscript_</code> fields?', a: 'Script parameters, defined on the Script record and set per deployment. Read them with <code>runtime.getCurrentScript().getParameter()</code>.' },
    { q: 'Why deploy with status Testing first?', a: 'A Testing deployment runs only for the script owner, so others are unaffected while you check it.' },
    { q: 'Governance budget for a User Event script?', a: '1,000 usage units per execution.' },
    { q: 'Governance budget for a Scheduled script?', a: '10,000 usage units per execution.' },
    { q: 'How do you check remaining governance?', a: '<code>runtime.getCurrentScript().getRemainingUsage()</code>' },
    { q: 'Name the four <code>N/log</code> levels from lowest to highest.', a: '<code>debug</code>, <code>audit</code>, <code>error</code>, <code>emergency</code>.' },
  ],
  quiz: [
    { q: 'Which JSDoc tag decides which entry points NetSuite calls?', options: ['<code>@NApiVersion</code>', '<code>@NScriptType</code>', '<code>@NModuleScope</code>', '<code>@NEntryPoint</code>'], answer: 1, why: '<code>@NScriptType</code> declares the script type, and each type has a fixed set of entry points.' },
    { q: 'In <code>define([\'N/search\', \'N/record\'], (a, b) => ...)</code>, what is <code>b</code>?', options: ['The search module', 'The record module', 'undefined', 'An array of both'], answer: 1, why: 'Modules are injected in the same order they are listed, so the second parameter is <code>N/record</code>.' },
    { q: 'You want a Suitelet to show a temporary "Route" dropdown that is not stored anywhere. What ID prefix does the field use?', options: ['<code>custbody_</code>', '<code>custrecord_</code>', '<code>custpage_</code>', '<code>custscript_</code>'], answer: 2, why: '<code>custpage_</code> marks fields added to a page at runtime by a script. They are not saved to the database.' },
    { q: 'A nightly job must email statements to 300 customers (20 units per email). Which script type fits best?', options: ['User Event', 'Client script', 'Suitelet', 'Map/Reduce'], answer: 3, why: '300 × 20 = 6,000 units plus searches, far beyond the 1,000-unit budget of User Event and Suitelet scripts. Map/Reduce gives each map call its own budget and handles yielding and retries for you. Client scripts run in the browser and are not for batch work.' },
    { q: 'Where do you choose which record type a User Event script runs on?', options: ['In the JSDoc header', 'In the <code>define</code> array', 'On the Script Deployment', 'In <code>N/runtime</code>'], answer: 2, why: 'The deployment ties the script to a record type (Applies To), roles, status and log level.' },
    { q: 'What happens when a script runs out of governance units?', options: ['It pauses until tomorrow', 'NetSuite throws <code>SSS_USAGE_LIMIT_EXCEEDED</code> and stops it', 'It silently skips remaining API calls', 'It switches to a Scheduled script'], answer: 1, why: 'The script is terminated with a usage-limit error. Work done before that point is not rolled back, which is why checking <code>getRemainingUsage()</code> matters.' },
  ],
  labs: [
    {
      title: 'Complete the User Event skeleton',
      file: 'ue_hs_sales_order.js',
      scenario: 'Fill in the header and module wiring for a Sales Order User Event that logs the delivery date before saving.',
      code: `
/**
 * @NApiVersion {{2.1}}
 * @NScriptType {{UserEventScript}}
 */
{{define}}(['N/log'], (log) => {

  const beforeSubmit = (context) => {
    const rec = context.newRecord;
    log.{{debug}}({
      title: 'Delivery date',
      details: rec.getValue({ fieldId: '{{custbody_hs_delivery_date}}' }),
    });
  };

  {{return}} { beforeSubmit };
});`,
      hint: 'Use the modern API version, the script type for record events, the AMD loader function, the lowest log level, and the delivery-date field from the reference table on the home page.',
      explain: 'The header selects API 2.1 and the User Event type. <code>define</code> injects <code>N/log</code>, and the returned object exposes <code>beforeSubmit</code> so NetSuite can call it whenever a Sales Order is saved.',
    },
    {
      title: 'Read a script parameter',
      file: 'ue_hs_sales_order.js',
      scenario: 'The order cut-off hour (14 = 2 pm) is stored as a script parameter so ops can change it without editing code. Read it, with 14 as a fallback.',
      code: `
define(['{{N/runtime}}'], (runtime) => {
  const cutoffHour = () => {
    const script = runtime.{{getCurrentScript}}();
    const value = script.{{getParameter}}({ name: '{{custscript_hs_cutoff_hour}}' });
    return value ? Number(value) : 14;
  };
  return { cutoffHour };
});`,
      hint: 'Parameters belong to the running script object from the runtime module. Script parameter IDs start with custscript_ (try custscript_hs_cutoff_hour).',
      explain: '<code>runtime.getCurrentScript()</code> returns the executing script; <code>getParameter</code> reads the value set on the deployment. Falling back to 14 keeps the rule working if nobody filled the parameter in.',
    },
    {
      title: 'Guard against running out of units',
      file: 'ss_hs_reminders.js',
      scenario: 'A scheduled script loops over overdue invoices. Stop the loop when fewer than 100 units remain.',
      code: `
for (const invoiceId of invoiceIds) {
  if (runtime.getCurrentScript().{{getRemainingUsage}}() {{<}} 100) {
    log.{{audit}}({ title: 'Stopping early', details: \`Last done: \${lastId}\` });
    {{break}};
  }
  sendReminder(invoiceId);
  lastId = invoiceId;
}`,
      hint: 'There is a method that returns remaining usage units. Use the log level for notable business events, and the keyword that leaves a loop.',
      explain: 'Checking <code>getRemainingUsage()</code> at the top of each pass lets the script stop cleanly before NetSuite kills it. Logging the last processed ID at <code>audit</code> level makes the stop visible in production logs.',
    },
  ],
});

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm3',
  order: 3,
  title: 'Records with N/record',
  summary: 'Load, create and update Sales Orders and customers; read item lines; transform orders into fulfillments and invoices.',
  lesson: [
    { p: '<code>N/record</code> is how a script reads and writes a single record: a Sales Order, a customer, an item, a custom Delivery Run. Every call takes an options object with named properties.' },
    { h: 'Load, read, change, save' },
    { code: `
const so = record.load({
  type: record.Type.SALES_ORDER,
  id: 10442,
  isDynamic: false,
});

const customerId = so.getValue({ fieldId: 'entity' });          // "1482"
const customer   = so.getText({ fieldId: 'entity' });           // "Copper Kettle Café"
const delivery   = so.getValue({ fieldId: 'custbody_hs_delivery_date' }); // Date

so.setValue({ fieldId: 'custbody_hs_route', value: 2 });
const savedId = so.save();   // returns the internal ID` },
    { list: [
      '<code>getValue</code> returns the stored value: an internal ID for select fields, a <code>Date</code> for date fields, a number for currency, a boolean for checkboxes.',
      '<code>getText</code> returns what the user sees: the customer\'s name, the route label.',
      '<code>save()</code> returns the record\'s internal ID. It costs 20 units for a transaction.',
    ] },
    { h: 'Standard vs dynamic mode' },
    { p: 'In <strong>standard</strong> mode (<code>isDynamic: false</code>) you set values in any order and NetSuite sources and validates on save. In <strong>dynamic</strong> mode the record behaves like the UI: setting the customer sources terms, address and price level immediately, and you edit lines by selecting them. Use dynamic mode when you rely on sourcing.' },
    { h: 'Sublists (item lines)' },
    { code: `
const lineCount = so.getLineCount({ sublistId: 'item' });

for (let i = 0; i < lineCount; i++) {
  const itemId = so.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
  const qty    = so.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
  log.debug({ title: \`Line \${i}\`, details: \`\${itemId} × \${qty}\` });
}` , label: 'Standard mode: lines are 0-indexed' },
    { code: `
const so = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });
so.setValue({ fieldId: 'entity', value: 1482 });   // sources terms, address, price level

so.selectNewLine({ sublistId: 'item' });
so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 311 });
so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 12 });
so.commitLine({ sublistId: 'item' });

const newId = so.save();`, label: 'Dynamic mode: select, set, commit' },
    { h: 'submitFields: the cheap update' },
    { p: 'If you only need to change body fields, <code>record.submitFields</code> updates them without loading the whole record. It cannot touch sublist lines.' },
    { code: `
record.submitFields({
  type: record.Type.SALES_ORDER,
  id: 10442,
  values: { custbody_hs_route: 3, custbody_hs_driver: 57 },
  options: { enableSourcing: false, ignoreMandatoryFields: true },
});` },
    { h: 'Transform: follow the order flow' },
    { p: 'An order becomes an Item Fulfillment when it is picked and shipped, and an Invoice when it is billed. <code>record.transform</code> does what the Fulfill and Bill buttons do, copying lines across.' },
    { code: `
const fulfillment = record.transform({
  fromType: record.Type.SALES_ORDER,
  fromId: 10442,
  toType: record.Type.ITEM_FULFILLMENT,
  isDynamic: true,
});
fulfillment.setValue({ fieldId: 'shipstatus', value: 'C' });   // C = Shipped
const ifId = fulfillment.save();` },
    { note: 'Use <code>record.Type.SALES_ORDER</code> rather than the string <code>\'salesorder\'</code>. The enum catches typos and reads better. For custom records, pass the script ID string such as <code>\'customrecord_hs_delivery_run\'</code>.' },
  ],
  cards: [
    { q: 'What does <code>record.load</code> need at minimum?', a: '<code>type</code> and <code>id</code>. Optionally <code>isDynamic</code>.' },
    { q: '<code>getValue</code> vs <code>getText</code> on the <code>entity</code> field?', a: '<code>getValue</code> returns the customer\'s internal ID; <code>getText</code> returns the display name.' },
    { q: 'What does <code>record.save()</code> return?', a: 'The internal ID of the saved record.' },
    { q: 'Are sublist line indexes 0- or 1-based in SuiteScript 2.x?', a: '0-based. Loop <code>for (let i = 0; i < count; i++)</code>.' },
    { q: 'Three calls to add a line in dynamic mode?', a: '<code>selectNewLine</code>, <code>setCurrentSublistValue</code> (once per field), <code>commitLine</code>.' },
    { q: 'When should you use dynamic mode?', a: 'When you need UI-style behaviour such as field sourcing as you set values (customer → terms, address, pricing).' },
    { q: 'What can\'t <code>record.submitFields</code> change?', a: 'Sublist (line) fields. It only updates body fields, but it is much cheaper than load + save.' },
    { q: 'Which call turns a Sales Order into an Invoice?', a: '<code>record.transform({ fromType: SALES_ORDER, fromId, toType: INVOICE })</code>' },
    { q: 'How do you load a custom Delivery Run record?', a: "<code>record.load({ type: 'customrecord_hs_delivery_run', id })</code>, using the custom record's script ID as the type." },
  ],
  quiz: [
    { q: 'You need to set one body field on 50 Sales Orders. Which approach uses the fewest units?', options: ['<code>record.load</code> + <code>setValue</code> + <code>save</code> for each', '<code>record.submitFields</code> for each', '<code>record.transform</code> for each', '<code>record.copy</code> for each'], answer: 1, why: '<code>submitFields</code> on a transaction costs 10 units; load (10) + save (20) costs 30.' },
    { q: 'What does this log for a 3-line order?', code: "for (let i = 1; i <= so.getLineCount({ sublistId: 'item' }); i++) {\n  log.debug({ title: 'item', details: so.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) });\n}", options: ['All three items', 'Lines 2 and 3, then an error on the out-of-range index', 'Nothing', 'The first line three times'], answer: 1, why: 'Lines are 0-based. Starting at 1 skips the first line and <code>line: 3</code> is out of range.' },
    { q: 'Which field returns a <code>Date</code> object from <code>getValue</code>?', options: ['<code>entity</code>', '<code>custbody_hs_delivery_date</code>', '<code>custbody_hs_route</code>', '<code>tranid</code>'], answer: 1, why: 'Date fields return JavaScript <code>Date</code> objects in server scripts. <code>entity</code> and the route list return IDs; <code>tranid</code> is text.' },
    { q: 'You create an order and want terms and shipping address filled in from the customer automatically. Which mode?', options: ['Standard', 'Dynamic', 'Either, sourcing never happens in scripts', 'Read-only'], answer: 1, why: 'Dynamic mode sources dependent fields as soon as you set <code>entity</code>, the way the UI does.' },
    { q: 'What is wrong here?', code: "record.submitFields({\n  type: record.Type.SALES_ORDER,\n  id: 10442,\n  values: { quantity: 24 }\n});", options: ['Nothing', '<code>quantity</code> is a line field, which <code>submitFields</code> cannot set', '<code>id</code> must be a string', '<code>values</code> must be an array'], answer: 1, why: '<code>submitFields</code> only handles body fields. To change line quantities, load the record and use the sublist methods.' },
    { q: 'Which call creates an Item Fulfillment from order 10442?', options: ['<code>record.create({ type: ITEM_FULFILLMENT, from: 10442 })</code>', '<code>record.copy({ type: SALES_ORDER, id: 10442 })</code>', '<code>record.transform({ fromType: SALES_ORDER, fromId: 10442, toType: ITEM_FULFILLMENT })</code>', '<code>record.fulfill(10442)</code>'], answer: 2, why: '<code>record.transform</code> mirrors the Fulfill button and copies the order\'s lines across.' },
  ],
  labs: [
    {
      title: 'Count cases on an order',
      file: 'lib_hs_orders.js',
      scenario: 'The warehouse wants the total quantity on an order to plan van space. Load the order and sum the <code>quantity</code> column.',
      code: `
const totalUnits = (orderId) => {
  const so = record.{{load}}({ type: record.Type.{{SALES_ORDER}}, id: orderId });
  const count = so.{{getLineCount}}({ sublistId: '{{item}}' });
  let units = 0;
  for (let i = {{0}}; i < count; i++) {
    units += so.{{getSublistValue}}({ sublistId: 'item', fieldId: 'quantity', line: i });
  }
  return units;
};`,
      hint: 'Load the order using the record type enum, count lines on the item sublist, start at the first index, and read a value from a specific line.',
      explain: 'Standard mode lets you read any line by index with <code>getSublistValue</code>. The loop runs from 0 to <code>count - 1</code>.',
    },
    {
      title: 'Assign a driver without loading',
      file: 'lib_hs_orders.js',
      scenario: 'Dispatch picks a driver for a route; stamp it on the order as cheaply as possible.',
      code: `
const assignDriver = (orderId, driverId) => {
  record.{{submitFields}}({
    type: record.Type.SALES_ORDER,
    id: orderId,
    {{values}}: { {{custbody_hs_driver}}: driverId },
    options: { ignoreMandatoryFields: {{true}} },
  });
};`,
      hint: 'The body-field-only update method takes a values object keyed by field ID. Check the reference table for the driver field.',
      explain: '<code>submitFields</code> changes body fields directly in the database for 10 units. Ignoring mandatory fields stops an unrelated empty required field from blocking the update.',
    },
    {
      title: 'Ship an order',
      file: 'lib_hs_orders.js',
      scenario: 'When the driver confirms loading, turn the order into a shipped Item Fulfillment and record the driver on it.',
      code: `
const shipOrder = (orderId, driverId) => {
  const ful = record.{{transform}}({
    fromType: record.Type.SALES_ORDER,
    fromId: orderId,
    toType: record.Type.{{ITEM_FULFILLMENT}},
    isDynamic: true,
  });
  ful.{{setValue}}({ fieldId: 'shipstatus', value: 'C' });
  ful.setValue({ fieldId: 'custbody_hs_driver', value: driverId });
  return ful.{{save}}();
};`,
      hint: 'Use the method that mirrors the Fulfill button, the fulfillment record type enum, the body-field setter, and the call that writes the record and returns its ID.',
      explain: '<code>record.transform</code> copies open lines from the order into a new fulfillment. Setting <code>shipstatus</code> to <code>C</code> marks it Shipped, and <code>save()</code> returns the new fulfillment\'s ID.',
    },
  ],
});
