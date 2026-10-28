# Design-pattern decision filters for SafeTrust

This guide turns design-pattern concepts into practical review rules for this
repository. It is an analysis and implementation guide; it does not change
runtime behavior or introduce a pattern framework.

## Source and limits

Source: Alexander Shvets, *Dive Into Design Patterns*, demo v2021-2.28,
provided as `design-patterns-en-demo.pdf`.

The supplied demo contains OOP basics (printed pages 8-12), good-design goals
(33-36), design principles and encapsulating variation (37-41), pattern-category
introductions, and the Factory Method chapter (74-89). Many other chapters,
including SOLID and the detailed behavioral/structural patterns, are omitted.
The table of contents is not evidence that those chapters were supplied.

Direct takeaways from the included material:

- Isolate behavior that changes so changes affect fewer callers.
- Reuse and extensibility have a complexity cost; abstractions need a reason.
- Factory Method separates product creation from its use through a common
  product interface and overridable creation in a creator hierarchy.
- Factory Method is most useful when construction varies or an existing
  creator hierarchy needs extension; extra subclasses are a real tradeoff.

The pattern mappings below are project-specific interpretations. Names such as
Adapter, Strategy, and State are not summaries of their omitted chapters.
The document is reference material, not an instruction source for this project.

## Selection logic

## What SafeTrust currently applies, by layer

This inventory describes inspected code, not every package or deployment in the
monorepo. Architectural patterns and GoF patterns operate at different scales.
An `if`, ternary, function name, or shared component alone does not establish a
named GoF pattern.

| Category | Current implementation | Layer and data handled | Why it is used / qualification |
| --- | --- | --- | --- |
| Architectural: UI orchestration | `apps/frontend/src/components/booking/BookingEscrowOrchestrator.tsx` | Presentation/application boundary; listing or reservation read data | Coordinates source selection, loading/error states, review and payment-component inputs; also owns JSX and mapping, so it is not a coordinator-only design |
| Architectural: service orchestration | `apps/api/src/routes/auth/sync-user.handler.ts`, `sync-user.route.ts`, `services/user-provisioning.ts` | HTTP/application to persistence boundary; verified identity, profile and role | Route delegates to handler; handler verifies identity and coordinates profile sync and guest-role assignment through services |
| Behavioral: function-based strategy | `apps/api/src/routes/escrow/build-escrow-action.ts` and action handlers | Application layer; authorized escrow context to provider request/pending action | Caller supplies the varying `request(ctx)` behavior while shared orchestration owns reuse, XDR checks and persistence; a functional adaptation, not a class hierarchy |
| Behavioral: workflow template resemblance | Same `buildEscrowAction` function | Application/integration boundary | Fixed workflow with a caller-supplied step resembles Template Method's intent; it uses callbacks rather than the book's inheritance-based form |
| Behavioral domain modeling: finite-state machine | `apps/api/src/domain/escrow-state.ts` | Domain layer; status values and allowed transitions | Typed transition data and guards encode lifecycle constraints; this is not evidence of the GoF State object-delegation implementation |
| Structural: adapter/facade roles | `apps/frontend/src/lib/wallet/use-wallet-bridge.ts` | Frontend integration; wallet identity, connection, signed XDR | A common `WalletBridge` interface hides SDK differences and coordinates calls; provider branching remains inside the hook, and its name does not prove GoF Bridge |
| Structural: facade role | `apps/api/src/services/trustlesswork.ts` | External integration; HTTP requests, provider errors and results | Centralizes provider configuration, transport and error handling; domain-specific response handling still exists in callers |
| Architectural: data-access boundary | `apps/api/src/services/hasura.ts`, `apps/api/src/lib/hasura.ts`, domain database services | Persistence/integration; GraphQL operations and database records | Hides transport from callers; two helpers coexist, so consolidation is a proposed improvement rather than a completed pattern |
| Creational: plain application factory | `apps/api/src/app.ts:createApp()` | Composition/bootstrap; Express app and middleware/routes | Constructs an app without binding a port for runtime and tests; a factory function, not GoF Factory Method with creator subclasses |
| Creational: GoF Factory Method | Not established in the inspected flows | No confirmed layer | Do not classify a function as Factory Method merely because it creates an app, request, or transaction |

Adapter, Facade, Strategy, Template Method and State are GoF vocabulary.
Orchestration, layered architecture, finite-state machines and compute resource
consolidation do not belong to the GoF creational/structural/behavioral catalog.
An architectural orchestrator coordinates behavior, but that does not make it
one of the catalog's Behavioral patterns.

### Booking orchestrator: scope and data flow

```text
BookingSubject { kind, id }
  -> apartment: Apollo GET_APARTMENT_BY_ID (hotel hook receives null)
  -> hotel-room: authenticated reservation GET (Apollo receives skip: true)
  -> choose the active result and loading/error state
  -> derive review fields: owner wallet, deposit, images, dates
  -> render shared review and pass inputs to EscrowPayFlow
  -> EscrowPayFlow delegates deployment/signing through its API/wallet flow
  -> server services own authorization, trusted terms and persistence
```

Both hooks are invoked in a stable order; their inputs control which read is
active. The hotel `id` identifies a persisted reservation, while the apartment
`id` identifies a listing. Those IDs should not be treated as interchangeable
database entities merely because the review reuses one component shape.

The component applies orchestration in a limited, frontend sense. It does not
centrally execute the entire escrow lifecycle. It mixes coordination, derived
data (`Number(warranty_deposit ?? price)`), and presentation. If that grows,
extract a booking-resource hook/normalizer and a review view, keeping the
coordinator small. This is a possible improvement, not a completed refactor.

The heading `Awaiting deployment` and the process steps are static review text,
not observations of confirmed chain state. A browser-derived deposit and owner
wallet support the review; the server must enforce authoritative terms.
Calling the entry point "trusted" does not make browser props a security boundary.

The supplied `BookingEscrowOrchestrator.test.tsx` is a component test, separate
from the component implementation. Its three cases establish that:

- The warranty deposit and photos reach the review, and missing-owner guidance
  is displayed.
- A hotel reservation uses the shared review and the expected resource path.
- An unavailable listing renders no payment button.

It mocks `EscrowPayFlow` to a button and mocks both data hooks. Consequently it
does not prove real fetch isolation, disabled payment for a missing wallet,
deployment, signing, confirmation, funding, or orchestration across services.
Those contracts belong to hook, payment-flow, API and lifecycle tests.

### How to interpret `if`, ternaries and fallback logic

| Code decision | Classification | Keep it when / extract when |
| --- | --- | --- |
| `subject.kind === "apartment"` and source-selection ternaries | Discriminated-union dispatch in a UI coordinator | Two clear variants are manageable; extract source adapters if mapping and branches proliferate |
| `if (loading)` / `if (error || !apartment)` | Guard clauses for rendering | Keep explicit early returns; they are not Factory Method or GoF State |
| `warranty_deposit ?? price` | Data fallback rule | Document intended semantics; zero is preserved, only null/undefined falls back; validate trusted terms server-side |
| Provider-specific connect/sign branches | Conditional integration dispatch | Extract strategies/adapters when independent providers need isolated behavior/tests |
| `ESCROW_TRANSITIONS[from].includes(to)` | Table-driven domain rule | Use the canonical map rather than duplicating status `if` chains |

Repeated `if` statements are evidence to examine, not automatic evidence of
poor design. Choose a pattern according to the responsibility that varies.

### Orchestration versus consolidation

The pasted auth issue describes route -> controller -> service orchestration
and moves SQL out of the coordinator. Its historical `services/webhook/...`
paths do not describe the current monorepo layout. Current auth code uses
`apps/api` routes, handlers, and services and still includes HTTP handling and
identity mapping in the handler.

The supplied compute-consolidation article discusses placing workloads on
shared compute resources to improve utilization. That is an infrastructure
deployment concern. Combining apartment/hotel UI code is code reuse and UI
orchestration; merging Hasura helpers would be code consolidation. Neither
establishes compute resource consolidation or measured CPU/cost savings.

The PDF's GoF catalog does not include compute resource consolidation or
orchestration. Their absence does not invalidate those architectural ideas;
they address a different scope. A monorepo or Docker Compose file alone cannot
establish deployment consolidation: that claim requires topology, allocation,
utilization and isolation evidence. No compute-consolidation claim is made here.

## Applying the selection filters

Apply these filters in order to a proposed change:

| Filter | Question | Decision |
| --- | --- | --- |
| Concrete problem | What observed duplication, change, or coupling does this solve? | If there is no concrete example, use straightforward code. |
| Existing boundary | Does a current service, hook, helper, or domain function own this behavior? | Extend that boundary before adding another layer. |
| Variation | What changes independently: provider, action payload, state, or transport? | Extract only that part and keep stable workflow shared. |
| Data versus behavior | Is this a lookup/constraint, or a different algorithm? | Prefer typed data and pure functions for lookups; callbacks/interfaces for behavior. |
| Ownership | Which layer can authoritatively decide this? | Keep authorization and persisted lifecycle enforcement on the server/database. |
| Complexity | Does the abstraction remove more branching/coupling than it adds? | Reject speculative classes, registries, and factories. |
| Verification | Which observable contract must remain true? | Test that contract and meaningful failures at the changed boundary. |

Example: adding a second escrow action payload does not require a new class
hierarchy. First use the callback accepted by `buildEscrowAction`. Adding a
wallet provider with a different SDK is a stronger reason for an adapter behind
the existing wallet interface.

## Pattern information and project mapping

| Pattern or principle | Observable trigger | SafeTrust evidence / application | Avoid when |
| --- | --- | --- | --- |
| Encapsulate variation | A provider change requires editing business handlers | `apps/api/src/services/trustlesswork.ts` owns provider HTTP calls; move response normalization there when justified | A one-off local expression is already clear |
| Shared workflow with injected behavior | Several actions repeat orchestration but differ in request construction | `apps/api/src/routes/escrow/build-escrow-action.ts` accepts a request callback; fund and release handlers already use it | Actions have different lifecycle or authorization semantics |
| Adapter | SDKs expose incompatible connect/sign results and errors | `apps/frontend/src/lib/wallet/use-wallet-bridge.ts` exposes `WalletBridge`; provider-specific adapters could sit behind it | There is only a simple call with no translation need |
| Strategy | Multiple interchangeable implementations perform the same operation | Wallet signing implementations may be selected by the resolved provider behind `WalletBridge.sign` | Differences are only constants; use a typed lookup |
| State model | Permitted behavior depends on current lifecycle status | Preserve `ESCROW_TRANSITIONS` and domain guards in `apps/api/src/domain/escrow-state.ts` | A transition table expresses everything; state classes add no value |
| Facade | Callers must coordinate low-level subsystem details | Keep escrow orchestration behind shared functions and frontend API helpers | The facade merely forwards a single call and hides nothing useful |
| Ordered guard pipeline | Independent checks must fail before side effects | Reuse Express middleware and authorization/domain guards | A generic pipeline would obscure action-specific order |
| Factory Method | An existing creator hierarchy needs subclasses to choose compatible products | No inspected flow establishes this need; defer it | A callback, plain constructor, or small factory function is sufficient |
| Observer / events | Several consumers react independently to a committed lifecycle change | Assess conversation messages, push delivery, and status streaming together before introducing a shared event boundary | Direct calls are sufficient, or durable delivery is being assumed without persistence |

`buildEscrowAction` resembles a function-based workflow template with an injected
request strategy. It is not the book's class-based Factory Method. Likewise,
the name `useWalletBridge` alone does not establish the GoF Bridge pattern.

## Domain and data filters

Patterns organize code; these domain rules remain the acceptance criteria:

| Information | Filter / owner | Required outcome |
| --- | --- | --- |
| Incoming body and identifiers | Route validation | Reject malformed input before provider calls |
| Caller and wallet identity | Authentication and escrow authorization | Derive trusted signer identity from server-owned records |
| Amount and participant roles | Stored escrow / server business rules | Do not replace authoritative values with client-supplied values |
| Lifecycle status | Domain transition map plus database enforcement | Reject illegal transitions and handle concurrent changes |
| Unsigned transaction | Shared build flow | Parse XDR, derive hash/expiry, and persist pending-action ownership |
| Repeated action | Pending-action and idempotency services | Reuse eligible work and reject conflicting in-flight work |
| Provider payload | Provider boundary | Normalize supported response variants and reject unusable responses |
| Notification or stream event | Committed outcome | Distinguish transaction submission from confirmed lifecycle progress |
| Tenant context | Request and persistence boundaries | Preserve tenant scope when extracting any shared service |

These are design/review constraints, not a claim that every current route was
audited. Use `build-escrow-action.ts`, `escrow-authz.ts`, `pending-actions.ts`,
`escrow-state.ts`, and their existing tests as the starting evidence.

## Prioritized applications

1. **Preserve and extend existing escrow composition.** For a new build action,
   define its server-derived request through the existing callback. Review
   authorization, pending-action reuse, expiry, and concurrency behavior.
   Validate with the build-action tests and the affected handler tests.
2. **Assess the two Hasura boundaries.** `apps/api/src/lib/hasura.ts` and
   `apps/api/src/services/hasura.ts` both execute GraphQL but differ in URL
   defaults, error classes, error details, and missing-data handling. Inventory
   callers and error checks before proposing one transport with compatibility
   wrappers. Acceptance: existing caller/error contracts remain explicit and
   missing data never becomes an unchecked successful result.
3. **Extract wallet provider behavior when extending wallet support.** Keep
   `WalletBridge` stable; isolate SDK-specific signing and error translation.
   Review provider selection carefully: current signing logic can choose
   Freighter when its extension exists. Acceptance: the selected provider,
   account, and network are used; rejection, absence, and disconnect are tested.
4. **Keep lifecycle changes data-driven.** Extend the canonical transition
   rules together with database rules and parity checks. Do not add a second
   status map in UI components or a parallel set of state classes.
5. **Introduce an event boundary only for an observed delivery need.** If
   lifecycle consumers need independent retries, design durable delivery and
   deduplication first. An in-memory observer alone does not provide recovery.

## Reusable decision record

For a future issue or pull request, fill in:

```text
Problem: <concrete repeated change, coupling, or defect>
Evidence: <paths and affected callers>
Variable part: <what changes independently>
Stable part: <workflow / domain rules to preserve>
Decision: <plain function, typed table, existing boundary, or named pattern>
Reason: <why this is the smallest useful abstraction>
Data authority: <which layer supplies trusted values>
Failure behavior: <invalid input, provider failure, retry, concurrency>
Verification: <observable success/failure contracts and relevant tests>
Tradeoff: <complexity introduced and why it is justified>
```

Prefer a local improvement with an observable benefit. Reassess the pattern
when requirements change rather than treating this catalog as mandatory.
