-- ─── Sprint 4: Payments & Escrow — extend audit_action enum ─────────────────
-- PostgreSQL ADD VALUE is non-transactional but safe: new values never break
-- existing rows. 'fund' and 'refund' are needed for escrow state transitions.

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'fund';--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'refund';--> statement-breakpoint
