# Escrow Lifecycle

State machine: PENDING -> INITIALIZED -> FUNDED -> MILESTONE_APPROVED -> COMPLETED; also DISPUTED -> RESOLVED.

Transaction sequence: deploy (server), fund (guest), approve milestone (host), release (guest).

XDR signing: unsigned from TrustlessWork, Freighter signs, send-transaction submits.

Idempotency: button disabled, state guard, unique reference.

Error states: Freighter rejection, tx failure, timeout, invalid transition.
