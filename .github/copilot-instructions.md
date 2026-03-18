# AppDesigner Copilot Instructions

You are helping build `AppDesigner`, an MVP startup product for non-technical but high-agency users who want to turn an app idea into a tangible prototype quickly.

Act like a senior product strategist, UX planner, and technical architect. Optimize for a credible prototype, not a broad platform. Make hard scope decisions. Prefer a polished single loop over feature breadth.

## 1. Product Summary

### Product idea
AppDesigner is a lightweight AI app-building prototype that lets a user describe the kind of app they want and get back a tangible app shell they can preview immediately.

This is not a general-purpose code generator. It is a focused concept demo that turns a plain-English app idea into a structured, believable frontend prototype.

### Target user
The target user is a non-technical but high-agency builder:
- founders validating a product idea
- indie hackers testing a concept
- creators packaging a workflow into software
- operators who know what they want built but do not want to start from a blank canvas

These users are not asking for deep engineering control in v1. They want momentum, clarity, and something concrete they can react to.

### Main pain point
The user has an app idea but cannot quickly turn it into something visible and credible without:
- hiring someone
- learning a full stack
- wrestling with vague AI output
- getting a messy result that does not feel product-like

### MVP promise
Describe your app in plain English and get a working, previewable app shell that feels like the first believable version of a real product.

## 2. MVP Scope

### Included in v1
- one marketing landing page
- one in-app builder screen
- one prompt input flow
- one AI generation step
- one generated result type: a simple multi-page SaaS or dashboard shell
- one preview experience rendered from structured config and prebuilt UI templates
- seeded sample data to make the output feel populated and real
- a small set of supported app patterns such as CRM, booking, creator dashboard, inventory, internal tool, and event management

### Explicitly excluded from v1
- arbitrary full-stack code generation
- exporting source code
- user accounts and team collaboration
- persistent project history
- visual drag-and-drop editing
- design annotation tools
- sketch-to-app flows
- advanced prompt decomposition or planning workspaces
- integrations with real databases or third-party APIs
- production deployment workflows
- customizable design systems
- multiple builder modes

### Scope rule
If a feature does not directly improve the single loop of prompt -> generate -> preview, cut it.

## 3. Core User Flow

1. The user lands on the marketing page.
2. They immediately understand that the product turns an app idea into a working prototype shell.
3. They see one strong call to action such as `Try the prototype`.
4. They click into the builder.
5. They enter a plain-English prompt describing the app they want.
6. They submit and see a short, polished generation state that communicates progress and intent mapping.
7. The system maps the prompt into a structured app config.
8. The app renders a previewable SaaS or dashboard shell using predefined layouts and components.
9. The user can click through a few generated pages and see seeded content that matches the prompt domain.
10. The user leaves with the feeling that the product understood their idea well enough to give them something tangible.

## 4. Barebones App Builder Spec

### Core feature
The single core feature is: user describes an app idea and receives a generated app shell preview.

### Input format
Use a single large textarea.

Do not build a guided multi-step form in v1. It adds friction and makes the product feel heavier than it is.

Support the textarea with:
- one clear label
- one example prompt below it
- a few clickable prompt examples or domain chips

That keeps the interface approachable while still feeling curated.

### What the user provides
The user should provide:
- what the app is for
- who it is for
- the main workflows or entities

Example:
`Build a lightweight CRM for a solo consultant to track leads, meetings, follow-ups, and deal stages.`

### What happens after submit
1. Validate the prompt is non-empty and reasonably descriptive.
2. Send the prompt to an AI endpoint.
3. Ask the model to return structured JSON in a strict schema.
4. Map that JSON into a predefined app shell renderer.
5. Render the result in a preview frame with clickable navigation.

### What the generated result should be in v1
The output should be a structured app shell containing:
- app name
- one short positioning sentence
- left nav or top nav
- 3 to 4 pages maximum
- page sections built from predefined components
- seeded sample records relevant to the app type

Supported pages should come from a fixed set such as:
- overview dashboard
- list page
- detail page
- calendar or bookings page
- settings page

Supported sections should come from a fixed set such as:
- KPI cards
- data tables
- recent activity lists
- charts
- forms
- empty states
- schedule views

### How limited the generated result can be while still feeling real
It is acceptable for v1 to:
- use a single visual style for all generated apps
- keep all data fake and seeded
- support only a narrow set of layouts
- constrain app types to a few predictable product categories

It is not acceptable for v1 to:
- produce a single static screenshot-like result
- feel like random lorem ipsum stuffed into a template
- show generic labels that ignore the prompt domain
- claim to have built real backend logic when it has not

### How to make it impressive without overbuilding
- generate a strong app name and page labels
- make the seeded data specific to the prompt domain
- keep the preview polished and interactive
- use loading copy that suggests reasoning, not magic
- show just enough structure that the result feels intentional

## 5. Output Strategy

### Primary output choice
Choose a simple multi-page SaaS or dashboard shell as the only primary output.

### Why this is the right choice
- It feels more substantial than a landing page mockup.
- It is more controllable than arbitrary code generation.
- It matches the kinds of apps target users naturally imagine.
- It gives enough surface area to show understanding of the prompt through navigation, sections, and sample data.
- It can be rendered reliably from structured config and reusable components.

### Why not other approaches
- Arbitrary full-stack code generation is too brittle for a fast prototype.
- Wireframe-only output feels too abstract and underwhelming.
- Landing-page-only generation undersells the product vision.
- CRUD skeletons without product framing feel too mechanical.

## 6. Landing Page Plan

### Hero section
Use a clean hero with:
- a sharp headline
- one supporting subheadline
- one primary CTA
- one secondary proof element such as a preview image or small product frame

### Positioning statement
`Turn your app idea into a believable prototype in minutes.`

### Subheadline
`Describe the product you want to build and get a working app shell with pages, structure, and sample data you can actually click through.`

### CTA
Primary CTA: `Try the prototype`

Secondary CTA, if needed: `See an example`

### Supporting sections
Keep the landing page short. Include only:
- how it works in 3 steps
- example outputs or app categories
- why this is useful for early-stage product thinking
- a small honesty section that frames the product as an early prototype

### Honest explanation without sounding weak
Say something like:
`This prototype focuses on the fastest path from idea to tangible product shape. It generates structured app shells, not production-ready software.`

That is honest, but still confident because it emphasizes speed and clarity rather than limitations.

## 7. UX / UI Direction

### Overall feel
The product should feel:
- modern
- premium
- restrained
- intentional
- quietly confident

Avoid generic AI startup tropes such as:
- loud gradients everywhere
- glowing neon orbs
- overloaded dashboards
- excessive motion
- vague futuristic copy

### Layout direction
- use generous whitespace
- keep content in a centered grid
- use clear vertical rhythm
- favor large simple blocks over dense section stacking

### Typography feel
- use a clean modern sans-serif
- strong headline weight
- neutral body text
- restrained use of size changes

The type should feel product-grade, not marketing-hype-heavy.

### Spacing
- roomy page padding
- consistent component spacing
- avoid cramped cards and stacked controls

### Component style
- soft but crisp radii
- subtle borders
- low-noise shadows
- high contrast text
- minimal ornamentation

### Interaction tone
- calm and direct
- avoid playful microcopy
- use progress states that feel thoughtful and competent

## 8. Technical Starter Plan

Choose one stack and keep it simple:

- frontend: `Next.js` with App Router and TypeScript
- state management: built-in React state only
- styling: `Tailwind CSS` with a small reusable component layer
- backend: Next.js route handlers
- AI integration: one LLM call that returns strict JSON
- preview strategy: render the generated config into predefined React templates inside the same app
- auth: no
- persistence: no, unless a lightweight local session cache becomes useful later

### Why this stack
- fast to stand up
- one codebase for landing page, builder, and API
- easy to demo
- minimal deployment complexity
- enough structure without over-engineering

## 9. Generation Strategy

### Chosen approach
Generate structured JSON and render it through predefined templates and components.

### Why this is the best MVP strategy
- faster to build than code generation
- more reliable in demos
- easier to constrain
- easier to improve iteratively
- still feels like the AI built something real

### Recommended generation flow
1. User prompt enters API route.
2. Model returns a typed app config in a strict schema.
3. Server validates the schema.
4. Renderer selects page templates and sections from a controlled component library.
5. Preview appears with seeded content and domain-specific labels.

### Guardrails
- support only a narrow set of page and section types
- map unsupported prompts to the closest supported app shell
- fail visibly when schema generation breaks rather than hiding errors

## 10. Data / Information Model

Keep the data model minimal.

### BuilderRequest
- `prompt`
- `timestamp`

### AppConfig
- `appName`
- `tagline`
- `appType`
- `navItems`
- `pages`
- `theme`

### PageConfig
- `id`
- `title`
- `pageType`
- `sections`

### SectionConfig
- `id`
- `sectionType`
- `title`
- `props`

### SeedData
- `entityName`
- `records`

No deeper data model is needed for v1.

## 11. Build Plan

### Phase 1: Landing page
- write the homepage copy
- design the hero and supporting sections
- create a single strong CTA into the builder
- add one preview visual or mock example

### Phase 2: Builder input
- create the builder page
- add the textarea, prompt examples, and submit action
- define validation rules and loading states

### Phase 3: Generation logic
- define the JSON schema for app configs
- create the API route
- craft the prompt template for the model
- validate and normalize the model output
- map common app intents to supported shell types

### Phase 4: Preview
- build the shared app shell layout
- create the fixed page templates
- render sections from config
- seed believable sample data
- let the user click through generated pages

### Phase 5: Polish
- improve loading experience
- tighten copy
- refine spacing and component consistency
- improve prompt examples
- test the strongest demo scenarios end to end

## 12. Risks and Weak Spots

### What could make the prototype disappointing
- generic output that does not reflect the prompt well
- weak seeded data that feels fake
- too many supported app types with shallow quality
- a preview that feels static instead of interactive
- marketing copy that overpromises production readiness

### What could make it confusing
- asking for too much structured input from the user
- using vague AI language instead of clear product language
- showing a result that looks polished but gives no sense of how it maps to the prompt

### What could make it too ambitious
- trying to generate code files
- adding auth and project storage too early
- supporting edits, regeneration history, and multiple modes in v1

## 13. Sharp Recommendations

### Prioritize
- one excellent landing page
- one frictionless prompt flow
- one highly believable dashboard-shell output
- coherent naming, navigation, and seeded sample content

### Cut
- everything that smells like platform architecture
- advanced customization
- export flows
- collaboration
- visual editing

### Fake manually if needed
- curated prompt-to-shell mappings
- seeded domain data
- a narrow list of supported app categories
- a few handcrafted demo outputs for the strongest example prompts

Manual support is fine if it makes the prototype feel stronger.

### What will make the product feel impressive fastest
- strong taste in the UI
- a sharp app name and structure in the generated result
- sample data that clearly matches the prompt
- a preview that users can click through immediately

## Working Principles for Future Implementation

- Do not expand scope beyond the single prototype loop.
- Do not build arbitrary code generation in v1.
- Keep the system honest about what it is generating.
- Favor reliability, coherence, and taste over novelty.
- If forced to choose, improve the preview quality before adding new capabilities.
