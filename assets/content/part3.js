/* Stops 7-9: batch processing, Suitelets/RESTlets/integrations, capstone */
window.COURSE_MODULES = window.COURSE_MODULES || [];

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm7',
  order: 7,
  title: 'Scheduled and Map/Reduce scripts',
  summary: 'Overnight jobs: build tomorrow\'s delivery runs, chase overdue invoices, and process thousands of records without hitting limits.',
  lesson: [
    { p: 'Some work should not happen while a user waits: building the van manifests for 180 orders, emailing statements to every customer with an overdue balance. Scheduled and Map/Reduce scripts run in the background on a timetable or on demand.' },
    { h: 'Scheduled scripts' },
    { p: 'A scheduled script has one entry point, <code>execute</code>, and 10,000 units. Use it for jobs that comfortably fit in that budget. Schedule it on the deployment (e.g. daily at 9:00 pm) or queue it from another script with <code>N/task</code>.' },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log'], (search, record, log) => {

  const execute = (context) => {
    const stopsByRoute = {};
    search.create({
      type: search.Type.SALES_ORDER,
      filters: [['mainline', 'is', 'T'], 'AND',
                ['status', 'anyof', 'SalesOrd:B'], 'AND',
                ['custbody_hs_delivery_date', 'on', 'tomorrow']],
      columns: ['custbody_hs_route'],
    }).run().each((r) => {
      const route = r.getValue({ name: 'custbody_hs_route' });
      stopsByRoute[route] = (stopsByRoute[route] || 0) + 1;
      return true;
    });

    Object.entries(stopsByRoute).forEach(([route, stops]) => {
      const run = record.create({ type: 'customrecord_hs_delivery_run' });
      run.setValue({ fieldId: 'custrecord_hs_run_route', value: route });
      run.setValue({ fieldId: 'custrecord_hs_run_stops', value: stops });
      run.save();
    });
    log.audit({ title: 'Runs built', details: JSON.stringify(stopsByRoute) });
  };

  return { execute };
});`, label: 'ss_hs_build_runs.js' },
    { h: 'Queueing a script from code' },
    { code: `
const t = task.create({
  taskType: task.TaskType.SCHEDULED_SCRIPT,
  scriptId: 'customscript_hs_build_runs',
  deploymentId: 'customdeploy_hs_build_runs',
  params: { custscript_hs_run_date: '2026-11-13' },
});
const taskId = t.submit();` },
    { h: 'Map/Reduce: the batch workhorse' },
    { p: 'Map/Reduce splits work into stages. NetSuite runs map and reduce calls in parallel, gives each call its own governance budget, and yields and resumes automatically. That makes it the default choice for anything that touches many records.' },
    { table: [
      ['Stage', 'Job', 'Receives'],
      ['<code>getInputData</code>', 'Return the work list: a search, a search ID, an array or an object', '<code>inputContext</code>'],
      ['<code>map</code>', 'Runs once per input item. Transform it and <code>context.write({ key, value })</code>', '<code>context.key</code>, <code>context.value</code> (a JSON string)'],
      ['<code>reduce</code>', 'Runs once per unique key with all values written for that key', '<code>context.key</code>, <code>context.values</code> (array of strings)'],
      ['<code>summarize</code>', 'Runs once at the end. Log totals and errors', '<code>summary</code>'],
    ] },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/email', 'N/log'], (search, email, log) => {

  const getInputData = () => search.create({
    type: search.Type.INVOICE,
    filters: [['mainline', 'is', 'T'], 'AND',
              ['status', 'anyof', 'CustInvc:A'], 'AND',
              ['daysoverdue', 'greaterthan', 14]],
    columns: ['entity', 'tranid', 'amountremaining', 'daysoverdue'],
  });

  const map = (context) => {
    const row = JSON.parse(context.value);         // one search result
    context.write({
      key: row.values.entity.value,                // group by customer
      value: { tranid: row.values.tranid, due: row.values.amountremaining },
    });
  };

  const reduce = (context) => {
    const invoices = context.values.map((v) => JSON.parse(v));
    const lines = invoices.map((i) => \`\${i.tranid}: \${i.due}\`).join('\\n');
    email.send({
      author: AR_EMPLOYEE_ID,
      recipients: [Number(context.key)],           // customer internal ID
      subject: 'Overdue invoices – Harbourside Supply Co.',
      body: \`The following invoices are overdue:\\n\${lines}\`,
    });
  };

  const summarize = (summary) => {
    if (summary.inputSummary.error) log.error({ title: 'Input', details: summary.inputSummary.error });
    summary.reduceSummary.errors.iterator().each((key, err) => {
      log.error({ title: \`Customer \${key}\`, details: err });
      return true;
    });
  };

  return { getInputData, map, reduce, summarize };
});`, label: 'mr_hs_overdue_reminders.js' },
    { list: [
      'Values passed between stages are strings. Objects you <code>write</code> are serialised to JSON, so <code>JSON.parse</code> them in the next stage.',
      'In <code>map</code>, a search result arrives as JSON: <code>{ id, recordType, values: { ... } }</code>. Select columns appear as <code>{ value, text }</code>.',
      'If you do not need grouping, skip <code>reduce</code> and do the work in <code>map</code>.',
      'An error in one map or reduce call does not stop the others. Collect them in <code>summarize</code>.',
    ] },
    { note: 'Map/Reduce can retry a map or reduce call after an interruption. Make each call <strong>idempotent</strong>: check whether the work is already done (e.g. invoice already created, reminder already sent today) before doing it again.', title: 'Design for retries' },
  ],
  cards: [
    { q: 'Entry point of a Scheduled script?', a: '<code>execute(context)</code>' },
    { q: 'Four stages of a Map/Reduce script?', a: '<code>getInputData</code>, <code>map</code>, <code>reduce</code>, <code>summarize</code>.' },
    { q: 'What can <code>getInputData</code> return?', a: 'A search object, a saved search reference, an array, an object, or a SuiteQL query reference.' },
    { q: 'What type is <code>context.value</code> in <code>map</code>?', a: 'A string. Parse it with <code>JSON.parse</code>.' },
    { q: 'What does <code>reduce</code> receive?', a: 'One unique <code>context.key</code> and <code>context.values</code>: an array of every string written for that key.' },
    { q: 'How do you queue a scheduled script from code?', a: '<code>task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT, scriptId, deploymentId, params }).submit()</code>' },
    { q: 'Why prefer Map/Reduce over Scheduled for large jobs?', a: 'Each map/reduce call gets its own governance, work runs in parallel, and NetSuite yields and resumes automatically.' },
    { q: 'What does "idempotent" mean for a map function?', a: 'Running it twice for the same input has the same effect as running it once, so retries do not double-send emails or duplicate records.' },
    { q: 'Where do you read errors from map calls?', a: 'In <code>summarize</code>: <code>summary.mapSummary.errors.iterator().each((key, err) => { ...; return true; })</code>.' },
  ],
  quiz: [
    { q: 'You want one email per customer listing all their overdue invoices. What should <code>map</code> write as the key?', options: ['The invoice ID', 'The customer ID', 'The invoice amount', 'A random number'], answer: 1, why: 'Writing the customer ID as the key groups every invoice for that customer into a single <code>reduce</code> call.' },
    { q: 'In <code>map</code>, <code>context.value.values.tranid</code> is undefined. Why?', options: ['The search lacks a tranid column', '<code>context.value</code> is a JSON string that needs <code>JSON.parse</code> first', 'Map cannot read search data', 'You must use <code>getValue</code>'], answer: 1, why: 'Values arrive as strings. Parse first: <code>JSON.parse(context.value).values.tranid</code>.' },
    { q: 'A reduce call throws for one customer. What happens to the others?', options: ['The whole script stops', 'They continue; the error is reported in summarize', 'All reduce calls are retried', 'NetSuite emails the customer anyway'], answer: 1, why: 'Calls are isolated. Errors are collected and available in <code>summary.reduceSummary.errors</code>.' },
    { q: 'Which job is a good fit for a plain Scheduled script?', options: ['Re-pricing 40,000 items', 'Creating four Delivery Run records each night', 'Emailing 2,000 statements', 'Transforming 900 orders into invoices'], answer: 1, why: 'Four small records fit easily inside 10,000 units. The others touch many records and benefit from Map/Reduce\'s per-call budgets and parallelism.' },
    { q: 'How do you pass a date to a queued scheduled script?', options: ['A global variable', 'A <code>params</code> object keyed by script parameter ID', 'The script\'s file name', 'You cannot'], answer: 1, why: 'Script parameters (<code>custscript_...</code>) passed in <code>params</code> are read with <code>runtime.getCurrentScript().getParameter()</code>.' },
    { q: 'Why should a reminder M/R check "already reminded today?" before emailing?', options: ['To save disk space', 'Map/reduce calls can be retried after interruptions, which could send duplicates', 'Email is limited to once per day', 'Summarize runs map twice'], answer: 1, why: 'NetSuite may rerun a call after a restart. Idempotent logic prevents double emails.' },
  ],
  labs: [
    {
      title: 'Group overdue invoices by customer',
      file: 'mr_hs_overdue_reminders.js',
      scenario: 'Complete the <code>map</code> stage so each overdue invoice is written under its customer\'s ID.',
      code: `
const map = (context) => {
  const row = JSON.{{parse}}(context.{{value}});
  context.{{write}}({
    {{key}}: row.values.entity.{{value}},
    value: { tranid: row.values.tranid, due: row.values.amountremaining },
  });
};`,
      hint: 'The input is a string. Output goes through a write call with a key and a value. The entity column is a select field, so it is an object with value and text.',
      explain: 'Parsing gives a result object; <code>entity.value</code> is the customer\'s internal ID. Using it as the key means <code>reduce</code> sees all of a customer\'s invoices together.',
    },
    {
      title: 'One email per customer',
      file: 'mr_hs_overdue_reminders.js',
      scenario: 'Finish <code>reduce</code>: parse every value and email a summary to the customer.',
      code: `
const reduce = (context) => {
  const invoices = context.{{values}}.map((v) => JSON.parse(v));
  const total = invoices.{{reduce}}((sum, i) => sum + Number(i.due), 0);
  email.{{send}}({
    author: AR_EMPLOYEE_ID,
    recipients: [Number(context.{{key}})],
    subject: \`\${invoices.length} overdue invoices\`,
    body: \`Total outstanding: \${total.toFixed(2)}\`,
  });
};`,
      hint: 'Reduce gets an array of strings and one key. Sum with the array method that folds values together.',
      explain: '<code>context.values</code> holds every invoice written for this customer. Summing <code>Number(i.due)</code> handles the string amounts from the search, and the key is the customer ID to email.',
    },
    {
      title: 'Report errors in summarize',
      file: 'mr_hs_overdue_reminders.js',
      scenario: 'Log every reduce error with the customer ID it belongs to.',
      code: `
const summarize = (summary) => {
  summary.{{reduceSummary}}.errors.{{iterator}}().each((key, err) => {
    log.{{error}}({ title: \`Customer \${key}\`, details: err });
    return {{true}};
  });
};`,
      hint: 'Each stage has its own summary object. Errors are iterated, and the callback must return the value that keeps iteration going.',
      explain: '<code>reduceSummary.errors.iterator().each()</code> walks every failed reduce call. Like search results, the callback must <code>return true</code> to continue.',
    },
  ],
});

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm8',
  order: 8,
  title: 'Suitelets, RESTlets and integrations',
  summary: 'Build a dispatcher page, receive proof of delivery from the drivers\' app, call outside services, send email and handle dates.',
  lesson: [
    { h: 'Suitelets: custom pages inside NetSuite' },
    { p: 'A Suitelet answers HTTP requests with a page. NetSuite\'s <code>N/ui/serverWidget</code> builds forms that look native. A <code>GET</code> shows the form; the submit button sends a <code>POST</code> back to the same Suitelet.' },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record'], (serverWidget, record) => {

  const onRequest = (context) => {
    if (context.request.method === 'GET') {
      const form = serverWidget.createForm({ title: 'Assign Drivers' });
      form.addField({ id: 'custpage_hs_date', type: serverWidget.FieldType.DATE, label: 'Delivery date' });
      form.addField({ id: 'custpage_hs_driver', type: serverWidget.FieldType.SELECT, label: 'Driver', source: 'employee' });

      const list = form.addSublist({ id: 'custpage_hs_orders', type: serverWidget.SublistType.LIST, label: 'Orders' });
      list.addField({ id: 'custpage_hs_pick', type: serverWidget.FieldType.CHECKBOX, label: 'Assign' });
      list.addField({ id: 'custpage_hs_so', type: serverWidget.FieldType.TEXT, label: 'Order' });
      // ...fill lines with list.setSublistValue({ id, line, value })

      form.addSubmitButton({ label: 'Assign' });
      context.response.writePage(form);
      return;
    }

    // POST: read what the dispatcher submitted
    const driver = context.request.parameters.custpage_hs_driver;
    const count = context.request.getLineCount({ group: 'custpage_hs_orders' });
    for (let i = 0; i < count; i++) {
      const picked = context.request.getSublistValue({ group: 'custpage_hs_orders', name: 'custpage_hs_pick', line: i });
      if (picked === 'T') { /* record.submitFields(...) */ }
    }
    context.response.write(\`Assigned driver \${driver}\`);
  };

  return { onRequest };
});`, label: 'sl_hs_assign_drivers.js' },
    { note: 'Values posted from a Suitelet arrive as strings. Checkboxes come through as <code>\'T\'</code> or <code>\'F\'</code>, not booleans.' },
    { h: 'RESTlets: JSON endpoints for other systems' },
    { p: 'A RESTlet exposes <code>get</code>, <code>post</code>, <code>put</code> and <code>delete</code> entry points to authenticated callers (token-based auth or OAuth 2.0). Harbourside\'s drivers use a phone app that posts proof of delivery to a RESTlet.' },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/error'], (record, error) => {

  const post = (body) => {
    if (!body.fulfillmentId || !body.signedBy) {
      throw error.create({ name: 'HS_BAD_REQUEST', message: 'fulfillmentId and signedBy are required' });
    }
    record.submitFields({
      type: record.Type.ITEM_FULFILLMENT,
      id: body.fulfillmentId,
      values: {
        custbody_hs_pod_name: body.signedBy,
        custbody_hs_pod_time: new Date(body.signedAt),
      },
    });
    return { ok: true, fulfillmentId: body.fulfillmentId };
  };

  return { post };
});`, label: 'rl_hs_pod.js' },
    { list: [
      'With <code>Content-Type: application/json</code>, NetSuite parses the request body into an object for you and serialises your returned object back to JSON.',
      'For <code>get</code> and <code>delete</code>, the argument is the URL query parameters.',
      'Records saved by a RESTlet <em>do</em> trigger User Event scripts, so the fulfillment\'s UE still runs.',
    ] },
    { h: 'Calling out with N/https' },
    { code: `
const res = https.post({
  url: 'https://routes.example.com/v1/optimise',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ depot: 'Harbourside', stops }),
});
if (res.code !== 200) throw error.create({ name: 'HS_ROUTER', message: res.body });
const plan = JSON.parse(res.body);` },
    { h: 'Email and dates' },
    { code: `
email.send({
  author: 57,                                  // an employee internal ID
  recipients: ['orders@coppercafe.example'],
  subject: 'Your Harbourside delivery is on its way',
  body: \`Your driver will arrive between \${slot.from} and \${slot.to}.\`,
  relatedRecords: { transactionId: soId },     // shows on the order
});

// Convert between user-formatted strings and Date objects
const d = format.parse({ value: '13/11/2026', type: format.Type.DATE });
const s = format.format({ value: new Date(), type: format.Type.DATE });` },
    { p: '<code>format.parse</code> and <code>format.format</code> follow the current user\'s date preference, so a script works whether the account uses day-first or month-first dates.' },
  ],
  cards: [
    { q: 'Entry point of a Suitelet?', a: '<code>onRequest(context)</code>, with <code>context.request</code> and <code>context.response</code>.' },
    { q: 'How do you show a serverWidget form?', a: '<code>context.response.writePage(form)</code>' },
    { q: 'What prefix do Suitelet form fields use?', a: '<code>custpage_</code>' },
    { q: 'How does a Suitelet tell GET from POST?', a: "<code>context.request.method === 'GET'</code>" },
    { q: 'How does a posted checkbox value arrive in a Suitelet?', a: "As the string <code>'T'</code> or <code>'F'</code>." },
    { q: 'RESTlet entry points?', a: '<code>get</code>, <code>post</code>, <code>put</code>, <code>delete</code>.' },
    { q: 'What does a RESTlet <code>post</code> receive with a JSON content type?', a: 'The parsed request body as a JavaScript object.' },
    { q: 'What must <code>email.send</code>\'s <code>author</code> be?', a: 'The internal ID of an employee record.' },
    { q: 'Why use <code>N/format</code> for dates?', a: 'It parses and formats using the user\'s date preference, so the code is not tied to one date layout.' },
    { q: 'Does a record saved by a RESTlet trigger User Event scripts?', a: 'Yes. Only saves made by User Event scripts skip other User Events.' },
  ],
  quiz: [
    { q: 'The dispatcher\'s Suitelet submits, but the code checks <code>if (picked === true)</code> and nothing is assigned. Why?', options: ['Suitelets cannot have checkboxes', "Posted checkbox values are the strings 'T'/'F'", 'The sublist must be INLINEEDITOR', 'POST requests are ignored'], answer: 1, why: "Request parameters are strings. Compare with <code>'T'</code>." },
    { q: 'The drivers\' app sends JSON with POST. Which RESTlet signature handles it?', options: ['<code>onRequest(context)</code>', '<code>post(body)</code>', '<code>execute(context)</code>', '<code>afterSubmit(context)</code>'], answer: 1, why: 'RESTlets map HTTP verbs to entry points; <code>post</code> receives the parsed body.' },
    { q: 'Where do you add a dropdown of employees to a Suitelet form?', options: ["<code>form.addField({ type: SELECT, source: 'employee', ... })</code>", '<code>form.addButton</code>', '<code>record.create</code>', '<code>search.lookupFields</code>'], answer: 0, why: '<code>source</code> fills a SELECT field from a record type or list.' },
    { q: 'A script must turn the user-entered text "13/11/2026" into a Date safely. Use:', options: ["<code>new Date('13/11/2026')</code>", "<code>format.parse({ value: '13/11/2026', type: format.Type.DATE })</code>", "<code>Date.parse('13/11/2026')</code>", "<code>Number('13/11/2026')</code>"], answer: 1, why: "<code>new Date</code> assumes month-first for this pattern and fails here. <code>format.parse</code> follows the user's date preference." },
    { q: 'A route optimiser returns HTTP 500. What does <code>https.post</code> do?', options: ['Throws automatically', 'Returns a response whose <code>code</code> is 500; you check it', 'Retries forever', 'Returns null'], answer: 1, why: 'Check <code>response.code</code> yourself and handle errors.' },
    { q: 'What shows an email on the Sales Order\'s Communication subtab?', options: ['Putting the order number in the subject', '<code>relatedRecords: { transactionId: soId }</code>', '<code>author: soId</code>', 'Nothing can'], answer: 1, why: '<code>relatedRecords</code> links the message to records such as a transaction or entity.' },
  ],
  labs: [
    {
      title: 'Receive proof of delivery',
      file: 'rl_hs_pod.js',
      scenario: 'Finish the RESTlet the drivers\' app calls after a customer signs.',
      code: `
const {{post}} = (body) => {
  if (!body.fulfillmentId || !body.signedBy) {
    throw error.create({ name: 'HS_BAD_REQUEST', message: 'Missing fields' });
  }
  record.{{submitFields}}({
    type: record.Type.{{ITEM_FULFILLMENT}},
    id: body.fulfillmentId,
    values: {
      {{custbody_hs_pod_name}}: body.signedBy,
      custbody_hs_pod_time: new Date(body.signedAt),
    },
  });
  {{return}} { ok: true };
};`,
      hint: 'Name the entry point after the HTTP verb. Update body fields cheaply. Check the reference table for the signer field.',
      explain: 'The <code>post</code> entry point receives the parsed JSON. <code>submitFields</code> writes the signer and time without loading the fulfillment, and the returned object goes back to the app as JSON.',
    },
    {
      title: 'Dispatcher form',
      file: 'sl_hs_assign_drivers.js',
      scenario: 'Build the GET side of the Suitelet: a date field, a driver dropdown and a submit button.',
      code: `
const onRequest = (context) => {
  if (context.request.{{method}} === 'GET') {
    const form = serverWidget.{{createForm}}({ title: 'Assign Drivers' });
    form.addField({ id: 'custpage_hs_date', type: serverWidget.FieldType.{{DATE}}, label: 'Delivery date' });
    form.addField({
      id: 'custpage_hs_driver',
      type: serverWidget.FieldType.SELECT,
      label: 'Driver',
      {{source}}: 'employee',
    });
    form.{{addSubmitButton}}({ label: 'Assign' });
    context.response.{{writePage}}(form);
  }
};`,
      hint: 'Check the HTTP verb, create the form, choose the date field type, fill the dropdown from employees, add a submit button and render the page.',
      explain: 'On GET, the Suitelet builds a native-looking form. <code>source: \'employee\'</code> fills the dropdown, and the submit button POSTs the form back to the same Suitelet.',
    },
    {
      title: 'Text the customer an arrival window',
      file: 'lib_hs_notify.js',
      scenario: 'Email the customer when their order leaves the depot and attach the message to the order.',
      code: `
const notifyDispatched = (soId, customerEmail, slot) => {
  email.{{send}}({
    {{author}}: DISPATCH_EMPLOYEE_ID,
    {{recipients}}: [customerEmail],
    subject: 'Your Harbourside delivery is on its way',
    body: \`Expect us between \${slot.from} and \${slot.to}.\`,
    {{relatedRecords}}: { {{transactionId}}: soId },
  });
};`,
      hint: 'The sender is an employee; the receivers are a list. The option that links the email to records takes an object keyed by record kind.',
      explain: '<code>author</code> must be an employee ID and <code>recipients</code> accepts emails or entity IDs. <code>relatedRecords.transactionId</code> files the email under the order\'s Communication tab.',
    },
  ],
});

/* ======================================================================= */
window.COURSE_MODULES.push({
  id: 'm9',
  order: 9,
  title: 'Capstone: delivery day, end to end',
  summary: 'Connect every script into one workflow, from order entry to auto-invoicing on signature, and learn the habits that keep it reliable.',
  lesson: [
    { p: 'Here is how the scripts from earlier stops fit together at Harbourside. Each step is small and owns one job; together they take an order from phone call to paid invoice with almost no manual work.' },
    { table: [
      ['When', 'Script', 'What it does'],
      ['Order entry', 'Client script (Stop 6)', 'Defaults next delivery day, rejects Sundays, rounds to cases, warns after cut-off'],
      ['Order save', 'User Event <code>beforeSubmit</code> (Stop 5)', 'Sets the route from the customer\'s zone; enforces the minimum order'],
      ['9:00 pm nightly', 'Scheduled / Map/Reduce (Stop 7)', 'Builds tomorrow\'s Delivery Run records and stop counts'],
      ['7:00 am', 'Suitelet (Stop 8)', 'Dispatcher assigns drivers to runs and orders'],
      ['Van loaded', 'Script or button (Stop 3)', 'Transforms each order into a shipped Item Fulfillment'],
      ['Customer signs', 'RESTlet (Stop 8)', 'Writes the signer and time onto the fulfillment'],
      ['Fulfillment saved', 'User Event <code>afterSubmit</code>', 'Signature just added? Bill the order and email the invoice'],
      ['Daily', 'Map/Reduce (Stop 7)', 'Chases invoices more than 14 days overdue'],
    ] },
    { h: 'Auto-invoice on signature' },
    { code: `
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], (record, log) => {

  const afterSubmit = (context) => {
    const { EDIT, XEDIT } = context.UserEventType;
    if (context.type !== EDIT && context.type !== XEDIT) return;

    const signedNow = context.newRecord.getValue({ fieldId: 'custbody_hs_pod_name' });
    const signedBefore = context.oldRecord.getValue({ fieldId: 'custbody_hs_pod_name' });
    if (!signedNow || signedBefore) return;            // only on the first signature

    const ful = record.load({ type: record.Type.ITEM_FULFILLMENT, id: context.newRecord.id });
    if (ful.getValue({ fieldId: 'custbody_hs_invoiced' })) return;   // idempotency guard
    const soId = ful.getValue({ fieldId: 'createdfrom' });

    try {
      const inv = record.transform({
        fromType: record.Type.SALES_ORDER, fromId: soId, toType: record.Type.INVOICE,
      });
      const invId = inv.save();
      record.submitFields({
        type: record.Type.ITEM_FULFILLMENT, id: ful.id,
        values: { custbody_hs_invoiced: true },
      });
      log.audit({ title: 'Invoiced on POD', details: \`SO \${soId} -> INV \${invId}\` });
    } catch (e) {
      log.error({ title: \`Invoice failed for SO \${soId}\`, details: e });
    }
  };

  return { afterSubmit };
});`, label: 'ue_hs_fulfillment_invoice.js' },
    { list: [
      'The RESTlet uses <code>submitFields</code>, so this UE sees an <code>XEDIT</code> where <code>newRecord</code> holds only the changed fields. That is why it loads the full fulfillment before reading <code>createdfrom</code>.',
      '<code>createdfrom</code> on a fulfillment points back to the Sales Order.',
      'The <code>custbody_hs_invoiced</code> flag makes the script safe to run twice.',
    ] },
    { h: 'Habits that keep automations healthy' },
    { list: [
      '<strong>One job per script.</strong> Small scripts are easier to test, deploy and switch off.',
      '<strong>Guard clauses first.</strong> Exit early on the wrong event type, wrong context or missing data.',
      '<strong>Make it idempotent.</strong> Assume any step can run twice; check before creating or sending.',
      '<strong>Parameters, not constants.</strong> Cut-off hours, employee IDs and email addresses belong in <code>custscript_</code> parameters.',
      '<strong>Log with intent.</strong> <code>audit</code> for business events, <code>error</code> with the record ID when things fail.',
      '<strong>Sandbox first, then SDF.</strong> Build in a sandbox account and move scripts, fields and deployments with the SuiteCloud Development Framework so production matches what you tested.',
      '<strong>Mind governance.</strong> Prefer <code>lookupFields</code> and <code>submitFields</code> over full load/save; move loops over many records into Map/Reduce.',
    ] },
  ],
  cards: [
    { q: 'Which field on an Item Fulfillment points back to its Sales Order?', a: '<code>createdfrom</code>' },
    { q: 'Why does the auto-invoice UE handle <code>XEDIT</code>?', a: 'The RESTlet updates the fulfillment with <code>submitFields</code>, which fires User Events as an inline edit (XEDIT).' },
    { q: 'In an XEDIT, what does <code>newRecord</code> contain?', a: 'Only the fields that changed. Load the record if you need anything else.' },
    { q: 'What is SDF?', a: 'SuiteCloud Development Framework: projects that bundle scripts, custom fields, records and deployments so they can be version-controlled and deployed between accounts.' },
    { q: 'Where should values like the cut-off hour live?', a: 'In script parameters (<code>custscript_...</code>) so admins can change them without a code change.' },
    { q: 'How does the capstone stop double invoicing?', a: 'It only acts when the signature is newly set, and checks a <code>custbody_hs_invoiced</code> flag before transforming.' },
    { q: 'Which Sales Order status means Pending Billing?', a: "<code>'SalesOrd:F'</code> (E is Pending Billing/Partially Fulfilled, G is Billed)." },
  ],
  quiz: [
    { q: 'Signatures arrive via RESTlet <code>submitFields</code>, but the auto-invoice UE checks only <code>EDIT</code>. What happens?', options: ['It works', 'It never fires for signatures, because they arrive as XEDIT', 'It fires twice', 'The RESTlet fails'], answer: 1, why: '<code>submitFields</code> triggers User Events with type <code>XEDIT</code>. Include it in the guard.' },
    { q: 'Which design best prevents duplicate invoices if the driver\'s app retries a POST?', options: ['Ask drivers not to tap twice', 'Only invoice when the signature changes from empty, and check an "invoiced" flag first', 'Wrap everything in try/catch', 'Use a client script'], answer: 1, why: 'Checking state before acting makes the workflow idempotent no matter how many times it is triggered.' },
    { q: 'The cut-off moves from 2 pm to 3 pm for the holidays. Best way to support that?', options: ['Edit and redeploy the script', 'A script parameter read with <code>runtime</code>', 'A comment in the code', 'Ask users to ignore the warning'], answer: 1, why: 'Script parameters let an admin change behaviour on the deployment with no code change or release.' },
    { q: 'Where should a new rule be built and tried first?', options: ['Production, Testing status', 'A sandbox account', 'The browser console', 'A RESTlet'], answer: 1, why: 'Build and test in a sandbox, then promote with SDF. A Testing deployment in production is a final check, not a replacement.' },
    { q: 'Inside the auto-invoice UE, why <code>record.load</code> the fulfillment rather than read <code>createdfrom</code> from <code>newRecord</code>?', options: ['load is cheaper', 'On XEDIT, <code>newRecord</code> holds only the changed fields, so <code>createdfrom</code> may be missing', '<code>createdfrom</code> is a line field', 'newRecord is null in afterSubmit'], answer: 1, why: 'Inline edits only carry changed fields. Loading guarantees the full record.' },
  ],
  labs: [
    {
      title: 'Auto-invoice on first signature',
      file: 'ue_hs_fulfillment_invoice.js',
      scenario: 'Complete the guard clauses and the transform that bills the order.',
      code: `
const afterSubmit = (context) => {
  const { EDIT, {{XEDIT}} } = context.UserEventType;
  if (context.type !== EDIT && context.type !== XEDIT) return;

  const signedNow = context.newRecord.getValue({ fieldId: 'custbody_hs_pod_name' });
  const signedBefore = context.{{oldRecord}}.getValue({ fieldId: 'custbody_hs_pod_name' });
  if (!signedNow || signedBefore) {{return}};

  const ful = record.load({ type: record.Type.ITEM_FULFILLMENT, id: context.newRecord.id });
  if (ful.getValue({ fieldId: '{{custbody_hs_invoiced}}' })) return;
  const soId = ful.getValue({ fieldId: '{{createdfrom}}' });

  const inv = record.{{transform}}({
    fromType: record.Type.SALES_ORDER, fromId: soId, toType: record.Type.{{INVOICE}},
  });
  inv.save();
};`,
      hint: 'Inline edits have their own event type. Skip if there is no signature now OR there already was one. The fulfillment points back to its order through the "created from" field.',
      explain: 'The guards make the script act only when a signature first appears, and the invoiced flag stops repeats. <code>createdfrom</code> leads back to the Sales Order, which <code>record.transform</code> bills.',
    },
    {
      title: 'Next delivery date with cut-off',
      file: 'lib_hs_dates.js',
      scenario: 'Pure JavaScript, shared by the client script and the User Event: orders before the cut-off go next day, later ones the day after, never on a Sunday.',
      code: `
const nextDeliveryDate = (placedAt, cutoffHour = 14) => {
  const d = new Date(placedAt.getFullYear(), placedAt.getMonth(), placedAt.getDate());
  const daysAhead = placedAt.{{getHours}}() {{<}} cutoffHour ? 1 : 2;
  d.{{setDate}}(d.getDate() + daysAhead);
  if (d.getDay() === {{0}}) d.setDate(d.getDate() + 1);
  {{return}} d;
};

nextDeliveryDate(new Date(2026, 10, 13, 11, 0)); // Fri 11am -> Sat 14 Nov
nextDeliveryDate(new Date(2026, 10, 13, 16, 0)); // Fri 4pm  -> Sun -> Mon 16 Nov`,
      hint: 'Compare the hour the order was placed against the cut-off; before it means one day ahead. Date has a setter for the day of the month, and it rolls over months automatically.',
      explain: 'Starting from midnight of the order day avoids time-of-day drift. <code>setDate</code> handles month ends, and the Sunday check bumps the date to Monday.',
    },
    {
      title: 'Build a Delivery Run record',
      file: 'mr_hs_build_runs.js',
      scenario: 'In the reduce stage, each key is a route and the values are its orders for tomorrow. Create one Delivery Run per route.',
      code: `
const reduce = (context) => {
  const run = record.{{create}}({ type: '{{customrecord_hs_delivery_run}}' });
  run.setValue({ fieldId: 'custrecord_hs_run_route', value: context.{{key}} });
  run.setValue({ fieldId: 'custrecord_hs_run_stops', value: context.values.{{length}} });
  const runId = run.{{save}}();
  context.write({ key: context.key, value: runId });
};`,
      hint: 'New records are created with the custom record type\'s script ID. Each reduce call has one key and an array of values; the stop count is how many values there are.',
      explain: 'Grouping orders by route in <code>map</code> means each <code>reduce</code> call is one route. The number of values is the stop count, and writing the new run ID lets <code>summarize</code> report what was built.',
    },
  ],
});
