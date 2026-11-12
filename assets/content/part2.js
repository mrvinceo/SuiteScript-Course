/* Stops 4-6: searching, User Event scripts, Client scripts */
window.COURSE_MODULES = window.COURSE_MODULES || [];

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm4',
  order: 4,
  title: 'Finding data: N/search and SuiteQL',
  summary: 'Find tomorrow\'s orders by route, look up a customer\'s zone in one call, page through big result sets, and query with SuiteQL.',
  lesson: [
    { p: 'Most automations start with a question: <em>which orders go out tomorrow on Route 2?</em> <em>Which invoices are 30 days overdue?</em> NetSuite gives you two tools for asking it: saved-search style queries with <code>N/search</code>, and SQL with <code>N/query</code> (SuiteQL).' },
    { h: 'search.create: filters and columns' },
    { code: `
const tomorrowsOrders = search.create({
  type: search.Type.SALES_ORDER,
  filters: [
    ['mainline', 'is', 'T'],
    'AND',
    ['status', 'anyof', 'SalesOrd:B'],                 // Pending Fulfillment
    'AND',
    ['custbody_hs_delivery_date', 'on', 'tomorrow'],
    'AND',
    ['custbody_hs_route', 'anyof', '2'],
  ],
  columns: [
    'tranid',
    'entity',
    search.createColumn({ name: 'custentity_hs_delivery_zone', join: 'customer' }),
    search.createColumn({ name: 'trandate', sort: search.Sort.ASC }),
  ],
});` },
    { list: [
      'A filter is <code>[field, operator, value]</code>. Join filters with <code>\'AND\'</code> / <code>\'OR\'</code> and nest arrays for brackets.',
      '<code>mainline is T</code> returns one row per transaction (the header). Without it you get a row for every line, plus tax and shipping rows.',
      'Transaction status values combine type and letter: <code>SalesOrd:A</code> Pending Approval, <code>SalesOrd:B</code> Pending Fulfillment, <code>CustInvc:A</code> open invoice.',
      'A <code>join</code> reads a field on a related record, here the customer\'s delivery zone.',
    ] },
    { h: 'Running it: each() and its limit' },
    { code: `
tomorrowsOrders.run().each((result) => {
  const docNo    = result.getValue({ name: 'tranid' });
  const customer = result.getText({ name: 'entity' });
  const zone     = result.getText({ name: 'custentity_hs_delivery_zone', join: 'customer' });
  log.debug({ title: docNo, details: \`\${customer} – \${zone}\` });
  return true;            // keep going; return false (or nothing) to stop
});` },
    { note: '<code>run().each()</code> stops after 4,000 results, and it stops after the first result if your callback forgets to <code>return true</code>. That missing return is one of the most common SuiteScript bugs.', title: 'Watch out' },
    { h: 'Paging large result sets' },
    { code: `
const paged = invoiceSearch.runPaged({ pageSize: 1000 });   // max page size is 1000
paged.pageRanges.forEach((range) => {
  const page = paged.fetch({ index: range.index });
  page.data.forEach((result) => {
    // handle each result
  });
});` },
    { h: 'lookupFields: one record, a few fields' },
    { p: 'When you know the record ID and just need a few values, <code>search.lookupFields</code> is far cheaper than loading the record (1 unit vs 5 to 10).' },
    { code: `
const cust = search.lookupFields({
  type: search.Type.CUSTOMER,
  id: customerId,
  columns: ['custentity_hs_delivery_zone', 'custentity_hs_min_order', 'email'],
});

// Select fields come back as an array of { value, text }:
const zone = cust.custentity_hs_delivery_zone[0]?.text;   // "North"
const minOrder = Number(cust.custentity_hs_min_order);     // "150.00" -> 150` },
    { h: 'Saved searches' },
    { p: 'Searches built in the UI can be loaded by ID. This lets an admin tweak criteria without a code change.' },
    { code: `
const s = search.load({ id: 'customsearch_hs_overdue_invoices' });
s.filters.push(search.createFilter({ name: 'daysoverdue', operator: search.Operator.GREATERTHAN, values: 30 }));` },
    { h: 'SuiteQL with N/query' },
    { p: 'SuiteQL is SQL over NetSuite\'s records. It is great for reporting-style joins. Use <code>?</code> placeholders for values; never paste user input into the SQL string.' },
    { code: `
const rows = query.runSuiteQL({
  query: \`
    SELECT t.id, t.tranid, BUILTIN.DF(t.entity) AS customer, t.foreigntotal AS total
    FROM transaction t
    WHERE t.type = 'SalesOrd'
      AND t.custbody_hs_route = ?
      AND t.custbody_hs_delivery_date = TO_DATE(?, 'YYYY-MM-DD')\`,
  params: [2, '2026-11-13'],
}).asMappedResults();

rows.forEach((r) => log.debug({ title: r.tranid, details: r.customer }));` },
    { list: [
      '<code>asMappedResults()</code> returns plain objects keyed by lower-case column names or aliases.',
      '<code>BUILTIN.DF(field)</code> returns the display value of a list or record field.',
      '<code>runSuiteQL</code> returns up to 5,000 rows; use <code>runSuiteQLPaged</code> for more.',
    ] },
  ],
  cards: [
    { q: 'What does the filter <code>[\'mainline\', \'is\', \'T\']</code> do on a transaction search?', a: 'Returns only the header row of each transaction, so you get one result per order instead of one per line.' },
    { q: 'What must a <code>run().each()</code> callback return to continue?', a: '<code>true</code>. Returning anything else (including nothing) stops after the current result.' },
    { q: 'Maximum results from <code>run().each()</code>?', a: '4,000. Use <code>runPaged</code> for more.' },
    { q: 'Max <code>pageSize</code> for <code>runPaged</code>?', a: '1,000 (minimum 5).' },
    { q: 'Status filter value for a Sales Order that is Pending Fulfillment?', a: "<code>'SalesOrd:B'</code>" },
    { q: 'How does <code>lookupFields</code> return a select field?', a: 'As an array of <code>{ value, text }</code> objects, e.g. <code>[{ value: "2", text: "North" }]</code>.' },
    { q: 'How do you read a column from a joined record in a result?', a: "Pass the join too: <code>result.getValue({ name: 'email', join: 'customer' })</code>." },
    { q: 'Why use <code>?</code> parameters in SuiteQL?', a: 'They keep values out of the SQL text, which avoids injection and quoting bugs.' },
    { q: 'What does <code>BUILTIN.DF()</code> do in SuiteQL?', a: 'Returns the display (text) value of a list/record field instead of its internal ID.' },
  ],
  quiz: [
    { q: 'This search logs only one order even though 40 match. Why?', code: "s.run().each((r) => {\n  log.debug({ title: r.getValue({ name: 'tranid' }) });\n});", options: ['<code>each</code> only returns one result by design', 'The callback does not <code>return true</code>', '<code>tranid</code> is not a valid column', 'Logging is rate-limited'], answer: 1, why: 'Without <code>return true</code> the callback returns <code>undefined</code>, which tells <code>each</code> to stop.' },
    { q: 'An order search returns 5 rows per order. What is the likely fix?', options: ['Add <code>[\'mainline\', \'is\', \'T\']</code>', 'Use <code>getText</code> instead of <code>getValue</code>', 'Switch to <code>runPaged</code>', 'Sort by <code>tranid</code>'], answer: 0, why: 'Without a mainline filter, transaction searches return the header plus every line (and tax/shipping lines).' },
    { q: 'You need a customer\'s zone and minimum order inside a User Event. Cheapest option?', options: ['<code>record.load</code> the customer', '<code>search.lookupFields</code>', 'A <code>search.create</code> with <code>run().each</code>', 'A SuiteQL query over all customers'], answer: 1, why: '<code>lookupFields</code> costs 1 unit and returns exactly the fields you ask for.' },
    { q: 'What does <code>cust.custentity_hs_delivery_zone</code> hold after <code>lookupFields</code>?', options: ['<code>"2"</code>', '<code>"North"</code>', '<code>[{ value: "2", text: "North" }]</code>', '<code>2</code>'], answer: 2, why: 'Select fields come back as an array of value/text pairs (empty array if unset).' },
    { q: 'Overdue-invoice reporting needs about 12,000 rows. Which approach works?', options: ['<code>run().each()</code>', '<code>runPaged({ pageSize: 1000 })</code> and fetch each page', '<code>getRange({ start: 0, end: 12000 })</code>', '<code>lookupFields</code>'], answer: 1, why: '<code>each</code> stops at 4,000 and <code>getRange</code> returns at most 1,000 per call. Paging handles any size.' },
    { q: 'Which SuiteQL call is safe against odd characters in <code>routeName</code>?', options: ["<code>runSuiteQL({ query: `... WHERE name = '${routeName}'` })</code>", "<code>runSuiteQL({ query: '... WHERE name = ?', params: [routeName] })</code>", "<code>runSuiteQL({ query: '... WHERE name = ' + routeName })</code>", 'All three are equivalent'], answer: 1, why: 'Bound parameters are passed separately from the SQL, so quotes or SQL keywords in the value cannot change the query.' },
  ],
  labs: [
    {
      title: 'Tomorrow\'s orders on a route',
      file: 'lib_hs_dispatch.js',
      scenario: 'Return the document numbers of Pending Fulfillment orders due tomorrow on a given route.',
      code: `
const ordersForRoute = (routeId) => {
  const ids = [];
  search.{{create}}({
    type: search.Type.SALES_ORDER,
    filters: [
      ['{{mainline}}', 'is', 'T'],
      '{{AND}}',
      ['status', 'anyof', '{{SalesOrd:B}}'],
      'AND',
      ['custbody_hs_delivery_date', 'on', '{{tomorrow}}'],
      'AND',
      ['custbody_hs_route', 'anyof', routeId],
    ],
    columns: ['tranid'],
  }).run().{{each}}((result) => {
    ids.push(result.getValue({ name: 'tranid' }));
    return {{true}};
  });
  return ids;
};`,
      hint: 'One row per order needs the header filter. Pending Fulfillment is status letter B on SalesOrd. NetSuite understands the relative date keyword for the next day.',
      explain: 'The filter expression narrows to header rows of Pending Fulfillment orders for tomorrow on this route. <code>each</code> visits every result, and <code>return true</code> keeps it going.',
    },
    {
      title: 'Look up a customer\'s delivery settings',
      file: 'lib_hs_customers.js',
      scenario: 'Fetch a customer\'s zone label and minimum order for use in other scripts.',
      code: `
const deliverySettings = (customerId) => {
  const f = search.{{lookupFields}}({
    type: search.Type.{{CUSTOMER}},
    id: customerId,
    {{columns}}: ['custentity_hs_delivery_zone', 'custentity_hs_min_order'],
  });
  const zone = f.custentity_hs_delivery_zone[{{0}}]?.{{text}};
  return { zone, minOrder: {{Number}}(f.custentity_hs_min_order) || 0 };
};`,
      hint: 'Select fields are arrays of { value, text } pairs. Currency comes back as a string and needs converting.',
      explain: '<code>lookupFields</code> returns only the requested columns for 1 unit. The zone is the first element\'s <code>text</code>; optional chaining (<code>?.</code>) avoids a crash when the zone is empty. <code>Number()</code> turns <code>"150.00"</code> into 150.',
    },
    {
      title: 'Route totals with SuiteQL',
      file: 'lib_hs_reports.js',
      scenario: 'Sum the value of open Sales Orders per route for a dispatch dashboard.',
      code: `
const routeTotals = () =>
  query.{{runSuiteQL}}({
    query: \`
      SELECT BUILTIN.DF(t.custbody_hs_route) AS route, SUM(t.foreigntotal) AS value
      FROM transaction t
      WHERE t.type = {{?}}
        AND t.status = 'B'
      {{GROUP BY}} BUILTIN.DF(t.custbody_hs_route)\`,
    params: ['SalesOrd'],
  }).{{asMappedResults}}();`,
      hint: 'Use the query function for SuiteQL, a placeholder for the type, the SQL clause that groups rows, and the method that turns results into plain objects.',
      explain: 'The <code>?</code> placeholder takes <code>\'SalesOrd\'</code> from <code>params</code>. <code>GROUP BY</code> collapses orders into one row per route, and <code>asMappedResults()</code> returns <code>[{ route, value }]</code> objects.',
    },
  ],
});

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm5',
  order: 5,
  title: 'User Event scripts',
  summary: 'Enforce order rules on save, fill in the route automatically, react to changes, and add buttons to forms.',
  lesson: [
    { p: 'A User Event (UE) script runs on the server whenever a record is loaded, saved or deleted, whether that happens in the UI, a CSV import, a web store order or another script. It is the right place for rules that must <em>always</em> hold.' },
    { h: 'The three entry points' },
    { table: [
      ['Entry point', 'Runs', 'Typical Harbourside use'],
      ['<code>beforeLoad</code>', 'Before the form is shown or the record is returned', 'Add a "Print Van Manifest" button; hide a field for the order desk role'],
      ['<code>beforeSubmit</code>', 'After the user clicks Save, before the database write', 'Set the route from the customer\'s zone; block orders below the minimum'],
      ['<code>afterSubmit</code>', 'After the record is committed', 'Email the customer; create a delivery task; update a related Delivery Run'],
    ] },
    { h: 'The context object' },
    { list: [
      '<code>context.newRecord</code>: the record being saved (or loaded). In <code>beforeSubmit</code> you can change it with <code>setValue</code>.',
      '<code>context.oldRecord</code>: the record as it was before this edit. Available on edit and delete in the submit entry points.',
      '<code>context.type</code>: why the script is running. Compare with <code>context.UserEventType.CREATE</code>, <code>EDIT</code>, <code>DELETE</code>, <code>XEDIT</code> (inline edit), <code>COPY</code>, <code>VIEW</code> and others.',
      '<code>context.form</code>: only in <code>beforeLoad</code>, for adding buttons, fields and client scripts.',
    ] },
    { h: 'beforeSubmit: set the route' },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search'], (search) => {
  const ROUTE_BY_ZONE = { North: 1, South: 2, East: 3, City: 4 };

  const beforeSubmit = (context) => {
    const { CREATE, EDIT } = context.UserEventType;
    if (context.type !== CREATE && context.type !== EDIT) return;

    const so = context.newRecord;
    if (so.getValue({ fieldId: 'custbody_hs_route' })) return;   // dispatcher already chose

    const customerId = so.getValue({ fieldId: 'entity' });
    const { custentity_hs_delivery_zone: zone } = search.lookupFields({
      type: search.Type.CUSTOMER, id: customerId, columns: ['custentity_hs_delivery_zone'],
    });
    const route = ROUTE_BY_ZONE[zone[0]?.text];
    if (route) so.setValue({ fieldId: 'custbody_hs_route', value: route });
  };

  return { beforeSubmit };
});`, label: 'ue_hs_so_route.js' },
    { note: 'Changes made to <code>newRecord</code> in <code>beforeSubmit</code> are saved with the record at no extra cost. In <code>afterSubmit</code> the record is already written, so changing <code>newRecord</code> does nothing; you would need <code>record.submitFields</code>.' },
    { h: 'Blocking a save' },
    { p: 'Throwing an error in <code>beforeSubmit</code> stops the save and shows the message to the user. Create a named error with <code>N/error</code> so it is easy to spot in logs.' },
    { code: `
if (total < minOrder) {
  throw error.create({
    name: 'HS_BELOW_MINIMUM',
    message: \`Order total \${total.toFixed(2)} is below this customer's minimum of \${minOrder.toFixed(2)}.\`,
    notifyOff: true,
  });
}` },
    { h: 'Detecting a change' },
    { code: `
const afterSubmit = (context) => {
  if (context.type !== context.UserEventType.EDIT) return;
  const before = context.oldRecord.getValue({ fieldId: 'custbody_hs_delivery_date' });
  const after  = context.newRecord.getValue({ fieldId: 'custbody_hs_delivery_date' });
  if (String(before) !== String(after)) {
    // delivery moved: notify dispatch, update the Delivery Run
  }
};` },
    { h: 'beforeLoad: add a button' },
    { code: `
const beforeLoad = (context) => {
  if (context.type !== context.UserEventType.VIEW) return;
  context.form.clientScriptModulePath = './cs_hs_manifest.js';
  context.form.addButton({
    id: 'custpage_hs_manifest',
    label: 'Print Van Manifest',
    functionName: 'printManifest',     // defined in the client script
  });
};` },
    { h: 'Rules of thumb' },
    { list: [
      'Exit early on types you do not care about. A UE on Sales Orders also runs on approvals, inline edits and deletes.',
      'Check <code>runtime.executionContext</code> if a rule should apply only to, say, the UI and not CSV imports.',
      'Saving a record from inside a UE does <strong>not</strong> trigger that record\'s own User Event scripts. This prevents infinite loops but also means downstream rules will not run.',
      'Keep UEs fast: users wait for <code>beforeSubmit</code> and <code>afterSubmit</code> before the page returns. Push heavy work to Map/Reduce.',
    ] },
  ],
  cards: [
    { q: 'Which UE entry point can change field values that are saved with the record?', a: '<code>beforeSubmit</code>, by calling <code>setValue</code> on <code>context.newRecord</code>.' },
    { q: 'How do you stop a record from saving in a UE?', a: 'Throw an error in <code>beforeSubmit</code>, ideally one built with <code>error.create</code>.' },
    { q: 'What is <code>context.oldRecord</code>?', a: 'The record as it was before the current edit. Use it to detect what changed.' },
    { q: 'What is <code>UserEventType.XEDIT</code>?', a: 'An inline edit (or <code>submitFields</code>). <code>newRecord</code> contains only the changed fields.' },
    { q: 'Where do you add a custom button to a form?', a: 'In <code>beforeLoad</code>, using <code>context.form.addButton</code>, with the function provided by a client script set via <code>form.clientScriptModulePath</code>.' },
    { q: 'Does saving a record from a UE trigger that record\'s User Event scripts?', a: 'No. Records saved by a User Event script do not fire their own User Event scripts.' },
    { q: 'Why is setting <code>newRecord</code> values in <code>afterSubmit</code> pointless?', a: 'The record is already committed. Use <code>record.submitFields</code> (or load and save) to change it.' },
    { q: 'Good use of <code>afterSubmit</code>?', a: 'Side effects that need the saved record\'s ID: sending email, creating tasks, updating related records.' },
  ],
  quiz: [
    { q: 'Ops wants the route filled in automatically from the customer\'s zone whenever an order is created. Where?', options: ['<code>beforeLoad</code>', '<code>beforeSubmit</code>', '<code>afterSubmit</code>', 'A Suitelet'], answer: 1, why: '<code>beforeSubmit</code> can set fields on <code>newRecord</code> and they are saved in the same write, at no extra cost.' },
    { q: 'An afterSubmit script calls <code>context.newRecord.setValue(...)</code>. What happens?', options: ['The value is saved', 'An error is thrown', 'Nothing is saved; the record has already been written', 'The record is saved twice'], answer: 2, why: 'By <code>afterSubmit</code> the database write is done. Use <code>record.submitFields</code> to change the stored record.' },
    { q: 'Which check makes a <code>beforeSubmit</code> rule run only for new orders?', options: ["<code>context.type === 'new'</code>", '<code>context.type === context.UserEventType.CREATE</code>', '<code>!context.oldRecord</code> only', '<code>context.newRecord.isNew()</code>'], answer: 1, why: 'Compare <code>context.type</code> to the <code>UserEventType</code> enum. (Copies arrive as <code>CREATE</code> in submit entry points too.)' },
    { q: 'A UE on Sales Orders updates a related Item Fulfillment with <code>record.save()</code>. The fulfillment has its own UE that emails the customer. Does the email go?', options: ['Yes, always', 'No; records saved from a User Event do not trigger their User Event scripts', 'Only in dynamic mode', 'Only if the deployment is Released'], answer: 1, why: 'NetSuite does not run User Event scripts on records saved by another User Event script. Put the email in the first script or move the work to a scheduled or map/reduce script.' },
    { q: 'Where is <code>context.form</code> available?', options: ['All UE entry points', '<code>beforeLoad</code> only', '<code>beforeSubmit</code> only', 'Client scripts only'], answer: 1, why: 'Only <code>beforeLoad</code> has a form to customise, and only when a form is actually being rendered.' },
    { q: 'A minimum-order rule should block web store and UI orders but not month-end CSV imports. What do you check?', options: ['<code>context.type</code>', '<code>runtime.executionContext</code>', '<code>context.form</code>', 'The user\'s role only'], answer: 1, why: '<code>runtime.executionContext</code> tells you the source: <code>USER_INTERFACE</code>, <code>WEBSTORE</code>, <code>CSV_IMPORT</code> and so on.' },
  ],
  labs: [
    {
      title: 'Enforce the customer\'s minimum order',
      file: 'ue_hs_so_minimum.js',
      scenario: 'Block new orders whose subtotal is below the customer\'s <code>custentity_hs_min_order</code>, unless the order desk ticks a waiver checkbox.',
      code: `
define(['N/search', 'N/error'], (search, error) => {
  const {{beforeSubmit}} = (context) => {
    if (context.type !== context.UserEventType.{{CREATE}}) return;
    const so = context.{{newRecord}};
    if (so.getValue({ fieldId: 'custbody_hs_min_waived' })) return;

    const { custentity_hs_min_order } = search.lookupFields({
      type: search.Type.CUSTOMER,
      id: so.getValue({ fieldId: '{{entity}}' }),
      columns: ['custentity_hs_min_order'],
    });
    const minOrder = Number(custentity_hs_min_order) || 0;
    const subtotal = so.getValue({ fieldId: 'subtotal' });

    if (subtotal < minOrder) {
      {{throw}} error.{{create}}({
        name: 'HS_BELOW_MINIMUM',
        message: \`Minimum order is \${minOrder.toFixed(2)}.\`,
        notifyOff: true,
      });
    }
  };
  return { beforeSubmit };
});`,
      hint: 'The rule must run before the write, only on new records. The customer is the transaction\'s entity field. Errors are built with the error module and then thrown.',
      explain: 'Throwing from <code>beforeSubmit</code> aborts the save and the user sees the message. The waiver checkbox gives the order desk a documented override.',
    },
    {
      title: 'Notify dispatch when a delivery date moves',
      file: 'ue_hs_so_datechange.js',
      scenario: 'If an edited order\'s delivery date changes, email the dispatch team. Compare the old and new values.',
      code: `
const afterSubmit = (context) => {
  if (context.type !== context.UserEventType.{{EDIT}}) return;

  const was = context.{{oldRecord}}.getValue({ fieldId: 'custbody_hs_delivery_date' });
  const now = context.newRecord.getValue({ fieldId: 'custbody_hs_delivery_date' });
  if (String(was) {{===}} String(now)) return;

  email.send({
    author: DISPATCH_EMPLOYEE_ID,
    recipients: ['dispatch@harbourside.example'],
    subject: \`Delivery moved: \${context.newRecord.getValue({ fieldId: 'tranid' })}\`,
    body: \`Was \${was}, now \${now}.\`,
    relatedRecords: { transactionId: context.newRecord.{{id}} },
  });
};`,
      hint: 'Only edits have a previous version. If the two dates match there is nothing to do. The saved record\'s internal ID is a property on newRecord.',
      explain: 'Dates are objects, so comparing them with <code>===</code> checks identity, not value; converting both to strings compares the actual dates. <code>relatedRecords</code> attaches the email to the order\'s Communication tab.',
    },
    {
      title: 'Add a manifest button',
      file: 'ue_hs_so_buttons.js',
      scenario: 'When viewing an order, show a "Print Van Manifest" button that calls a client-script function.',
      code: `
const {{beforeLoad}} = (context) => {
  if (context.type !== context.UserEventType.{{VIEW}}) return;
  context.form.{{clientScriptModulePath}} = './cs_hs_manifest.js';
  context.form.{{addButton}}({
    id: '{{custpage_hs_manifest}}',
    label: 'Print Van Manifest',
    {{functionName}}: 'printManifest',
  });
};`,
      hint: 'Buttons are added while the form is being built, when the user is viewing. Runtime UI elements use the custpage_ prefix.',
      explain: '<code>clientScriptModulePath</code> attaches the client script that defines <code>printManifest</code>; <code>addButton</code> wires the button to it by name.',
    },
  ],
});

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm6',
  order: 6,
  title: 'Client scripts',
  summary: 'React as the order desk types: reject Sundays, warn after the cut-off, round to whole cases and validate before save.',
  lesson: [
    { p: 'Client scripts run in the user\'s browser while a record is open in edit mode. They give instant feedback, but they only run in the UI: CSV imports, web services and other scripts skip them. Rules that must always hold belong in a User Event as well.' },
    { h: 'Entry points' },
    { table: [
      ['Entry point', 'Fires when', 'Return'],
      ['<code>pageInit</code>', 'The form finishes loading', 'nothing'],
      ['<code>fieldChanged</code>', 'A field value changes', 'nothing'],
      ['<code>postSourcing</code>', 'Sourcing triggered by a field change finishes', 'nothing'],
      ['<code>validateField</code>', 'The user tries to leave a field', '<code>true</code> to accept'],
      ['<code>lineInit</code>', 'A sublist line is selected', 'nothing'],
      ['<code>validateLine</code>', 'The user clicks Add / OK on a line', '<code>true</code> to accept'],
      ['<code>sublistChanged</code>', 'A line is committed or removed', 'nothing'],
      ['<code>saveRecord</code>', 'The user clicks Save', '<code>true</code> to save'],
    ] },
    { p: 'Each receives a <code>context</code> with <code>context.currentRecord</code>. Field-level entry points also get <code>context.fieldId</code>, <code>context.sublistId</code> and <code>context.line</code>; <code>pageInit</code> gets <code>context.mode</code> (<code>create</code>, <code>copy</code> or <code>edit</code>).' },
    { h: 'Default the delivery date' },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/ui/dialog'], (dialog) => {

  const nextDeliveryDay = (from) => {
    const d = new Date(from);
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);   // skip Sunday
    return d;
  };

  const pageInit = (context) => {
    if (context.mode !== 'create') return;
    const rec = context.currentRecord;
    if (!rec.getValue({ fieldId: 'custbody_hs_delivery_date' })) {
      rec.setValue({ fieldId: 'custbody_hs_delivery_date', value: nextDeliveryDay(new Date()) });
    }
  };

  return { pageInit };
});`, label: 'cs_hs_sales_order.js' },
    { h: 'Validate a field' },
    { code: `
const validateField = (context) => {
  if (context.fieldId !== 'custbody_hs_delivery_date') return true;
  const d = context.currentRecord.getValue({ fieldId: 'custbody_hs_delivery_date' });
  if (d && d.getDay() === 0) {
    dialog.alert({ title: 'No Sunday deliveries', message: 'Vans run Monday to Saturday.' });
    return false;          // keeps the user in the field
  }
  return true;             // forgetting this blocks every field
};` },
    { h: 'Round up to whole cases on a line' },
    { code: `
const fieldChanged = (context) => {
  if (context.sublistId !== 'item' || context.fieldId !== 'quantity') return;
  const rec = context.currentRecord;
  const itemId = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
  const qty = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
  const { custitem_hs_case_pack } = search.lookupFields({
    type: search.Type.ITEM, id: itemId, columns: ['custitem_hs_case_pack'],
  });
  const pack = Number(custitem_hs_case_pack) || 1;
  const rounded = Math.ceil(qty / pack) * pack;
  if (rounded !== qty) {
    rec.setCurrentSublistValue({
      sublistId: 'item', fieldId: 'quantity', value: rounded,
      ignoreFieldChange: true,   // don't re-trigger fieldChanged
    });
  }
};` },
    { note: 'Setting a field inside <code>fieldChanged</code> fires <code>fieldChanged</code> again. Pass <code>ignoreFieldChange: true</code> or guard the logic, or you get an infinite loop that freezes the page.', title: 'Watch out' },
    { h: 'Final check on save' },
    { code: `
const saveRecord = (context) => {
  const rec = context.currentRecord;
  if (!rec.getValue({ fieldId: 'custbody_hs_route' })) {
    dialog.alert({ title: 'Route missing', message: 'Choose a delivery route before saving.' });
    return false;
  }
  return true;
};` },
    { h: 'Attaching a client script' },
    { list: [
      'Deploy it on the record type, like a User Event, to run on every form.',
      'Attach it to a specific custom form (Custom Code subtab) to run only there.',
      'Set <code>form.clientScriptModulePath</code> from a UE <code>beforeLoad</code> or a Suitelet.',
    ] },
  ],
  cards: [
    { q: 'Which client entry points must return a boolean?', a: '<code>validateField</code>, <code>validateLine</code>, <code>validateInsert</code>, <code>validateDelete</code> and <code>saveRecord</code>.' },
    { q: 'How do you avoid an infinite loop when setting a field inside <code>fieldChanged</code>?', a: 'Pass <code>ignoreFieldChange: true</code> to <code>setValue</code> / <code>setCurrentSublistValue</code>, or guard the logic.' },
    { q: 'What does <code>context.mode</code> tell you in <code>pageInit</code>?', a: "Whether the record is being created (<code>'create'</code>), copied (<code>'copy'</code>) or edited (<code>'edit'</code>)." },
    { q: 'Do client scripts run during CSV imports?', a: 'No. They only run in the browser UI. Enforce must-have rules in a User Event too.' },
    { q: 'Read the item on the line currently being edited?', a: "<code>rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' })</code>" },
    { q: 'When does <code>postSourcing</code> fire?', a: 'After NetSuite finishes sourcing values triggered by a field change, e.g. after choosing a customer fills in terms and address.' },
    { q: 'Module for a NetSuite-styled pop-up message?', a: '<code>N/ui/dialog</code>, e.g. <code>dialog.alert({ title, message })</code>.' },
    { q: 'Entry point that runs when the user clicks Add on an item line?', a: '<code>validateLine</code>. Return <code>false</code> to reject the line.' },
  ],
  quiz: [
    { q: 'After deploying a <code>validateField</code> script, users can\'t leave any field. Why?', code: "const validateField = (context) => {\n  if (context.fieldId === 'custbody_hs_delivery_date') {\n    return isDeliveryDay(context.currentRecord);\n  }\n};", options: ['<code>validateField</code> must be async', 'Other fields return <code>undefined</code>, which counts as invalid', 'The fieldId is wrong', 'Client scripts cannot read dates'], answer: 1, why: 'Every path must return <code>true</code> to accept the value. Add <code>return true;</code> at the end.' },
    { q: 'Where should the "no Sunday deliveries" rule live so web store orders also obey it?', options: ['Client script only', 'User Event <code>beforeSubmit</code> (and optionally a client script for instant feedback)', 'Suitelet', 'Saved search'], answer: 1, why: 'Web store and import orders do not run client scripts. The server-side UE guarantees the rule; the client script adds friendly feedback.' },
    { q: 'Which context property identifies the changed field in <code>fieldChanged</code>?', options: ['<code>context.field</code>', '<code>context.fieldId</code>', '<code>context.changed</code>', '<code>context.name</code>'], answer: 1, why: '<code>context.fieldId</code>, plus <code>context.sublistId</code> and <code>context.line</code> for line fields.' },
    { q: 'You set terms whenever the customer changes, but the value is overwritten. Which entry point is better?', options: ['<code>pageInit</code>', '<code>postSourcing</code>', '<code>validateLine</code>', '<code>saveRecord</code>'], answer: 1, why: 'Choosing a customer triggers sourcing. <code>postSourcing</code> runs after sourcing completes, so your value is not replaced.' },
    { q: 'What does returning <code>false</code> from <code>saveRecord</code> do?', options: ['Saves without validation', 'Cancels the save and keeps the user on the form', 'Deletes the record', 'Reloads the page'], answer: 1, why: 'The save is cancelled. Tell the user why, typically with <code>dialog.alert</code>.' },
    { q: 'Which line-level entry point lets you reject an item line?', options: ['<code>lineInit</code>', '<code>sublistChanged</code>', '<code>validateLine</code>', '<code>fieldChanged</code>'], answer: 2, why: '<code>validateLine</code> runs when the user commits a line and can return <code>false</code>.' },
  ],
  labs: [
    {
      title: 'Reject Sunday delivery dates',
      file: 'cs_hs_sales_order.js',
      scenario: 'Stop users from entering a Sunday as the delivery date.',
      code: `
const {{validateField}} = (context) => {
  if (context.{{fieldId}} !== 'custbody_hs_delivery_date') return {{true}};
  const d = context.{{currentRecord}}.getValue({ fieldId: 'custbody_hs_delivery_date' });
  if (d && d.{{getDay}}() === {{0}}) {
    dialog.alert({ title: 'No Sunday deliveries', message: 'Pick Monday to Saturday.' });
    return {{false}};
  }
  return true;
};`,
      hint: 'The entry point that runs when leaving a field must return a boolean. JavaScript numbers Sunday as day 0.',
      explain: 'Unrelated fields return <code>true</code> straight away. For the delivery date, <code>getDay() === 0</code> detects Sunday and returning <code>false</code> keeps the user in the field.',
    },
    {
      title: 'Warn after the 2 pm cut-off',
      file: 'cs_hs_sales_order.js',
      scenario: 'If an order is created after 2 pm with tomorrow\'s delivery date, warn the order desk when they save. Return a value that still lets the save happen.',
      code: `
const {{saveRecord}} = (context) => {
  const rec = context.currentRecord;
  const now = new Date();
  const delivery = rec.getValue({ fieldId: 'custbody_hs_delivery_date' });
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (now.{{getHours}}() >= 14 && delivery && delivery.toDateString() === tomorrow.toDateString()) {
    dialog.{{alert}}({
      title: 'Past the cut-off',
      message: 'This order may not make tomorrow\\'s van. Check with dispatch.',
    });
  }
  return {{true}};
};`,
      hint: 'The save-time entry point must return a boolean. Date has a method for the hour of the day.',
      explain: '<code>getHours()</code> gives the local hour (0-23). The script warns but returns <code>true</code>, so the save proceeds. Comparing <code>toDateString()</code> values checks the calendar day and ignores time.',
    },
    {
      title: 'Round a line up to whole cases',
      file: 'cs_hs_sales_order.js',
      scenario: 'When the quantity on an item line changes, round it up to a multiple of the item\'s case pack.',
      code: `
const fieldChanged = (context) => {
  if (context.{{sublistId}} !== 'item' || context.fieldId !== 'quantity') return;
  const rec = context.currentRecord;
  const itemId = rec.{{getCurrentSublistValue}}({ sublistId: 'item', fieldId: 'item' });
  const qty = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
  const pack = Number(search.lookupFields({
    type: search.Type.ITEM, id: itemId, columns: ['{{custitem_hs_case_pack}}'],
  }).custitem_hs_case_pack) || 1;

  const rounded = Math.{{ceil}}(qty / pack) * pack;
  if (rounded !== qty) {
    rec.setCurrentSublistValue({
      sublistId: 'item', fieldId: 'quantity', value: rounded,
      {{ignoreFieldChange}}: true,
    });
  }
};`,
      hint: 'Line-field events carry the sublist ID. You need the current-line getter, the case-pack item field, rounding up, and the option that stops fieldChanged firing again.',
      explain: 'The guard limits the logic to the quantity column. <code>Math.ceil</code> rounds up to the next whole case, and <code>ignoreFieldChange: true</code> prevents the update from triggering <code>fieldChanged</code> recursively.',
    },
  ],
});
