# SuiteScript Route Book

An interactive course that teaches JavaScript through NetSuite **SuiteScript 2.1**. Every example is an
automation for a fictional wholesale distributor, Harbourside Supply Co., which sells and delivers
products to cafés, restaurants and offices.

Open `index.html` in a browser. There is no build step and nothing to install. It also works on GitHub Pages.

## What's inside

Nine stops, each with a lesson, flashcards, a multiple-choice quiz and a code lab where you type the
missing pieces of working scripts.

| Stop | Topic | What you automate |
| --- | --- | --- |
| 1 | JavaScript essentials | Order totals, case rounding, chilled-item lists |
| 2 | Anatomy of a SuiteScript file | JSDoc tags, `define`, deployments, field prefixes, governance |
| 3 | Records with `N/record` | Read order lines, assign drivers, ship orders with `transform` |
| 4 | `N/search` and SuiteQL | Tomorrow's orders by route, customer lookups, route totals |
| 5 | User Event scripts | Auto-route by zone, minimum-order rule, change alerts, form buttons |
| 6 | Client scripts | No-Sunday deliveries, cut-off warnings, whole-case quantities |
| 7 | Scheduled and Map/Reduce | Nightly delivery runs, overdue-invoice reminders |
| 8 | Suitelets, RESTlets, integrations | Dispatcher page, driver proof-of-delivery API, email, dates |
| 9 | Capstone | Auto-invoice on signature, cut-off date logic, idempotent design |

Totals: 79 flashcards, 53 quiz questions, 27 code labs.

Progress is stored in the browser's `localStorage`. Cards marked "Again" collect in the Review depot,
which also offers a 12-question mixed quiz.

## Layout

```
index.html               page shell
assets/app.css           styles (light and dark)
assets/app.js            course engine: routing, flashcards, quiz, code labs, progress
assets/content/part1.js  stops 1-3 and the custom field reference
assets/content/part2.js  stops 4-6
assets/content/part3.js  stops 7-9
```

## Adding content

Each content file pushes module objects onto `window.COURSE_MODULES`:

```js
{
  id: 'm10', order: 10, title: '...', summary: '...',
  lesson: [{ h: 'Heading' }, { p: 'HTML paragraph' }, { code: `...`, label: 'file.js' },
           { list: ['...'] }, { note: '...' }, { table: [['Head', 'Head'], ['cell', 'cell']] }],
  cards:  [{ q: 'front (HTML)', a: 'back (HTML)' }],
  quiz:   [{ q: '...', code: 'optional snippet', options: ['...'], answer: 0, why: '...' }],
  labs:   [{ title, file, scenario, hint, explain,
             code: `record.{{load}}({ type: record.Type.{{SALES_ORDER|SALES_ORDER}} })` }],
}
```

In lab code, `{{answer}}` becomes a blank. Separate accepted alternatives with `|`. Checking ignores
quote style and spacing around punctuation.

The custom fields (`custbody_hs_*`, `custentity_hs_*`, etc.) belong to the fictional account used in
the course. Swap in your own field IDs when you adapt the scripts.
