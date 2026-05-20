# ADR 0001: Cloudflare Workers, Static Assets, And Durable Objects

## Status
Accepted

## Context
ToddlerCarPool needs a small hosted web app with short-lived collaborative rooms. A room is the natural consistency boundary: families add ride needs and seat offers, then assign children to compatible seats.

## Decision
Use Cloudflare Workers Static Assets for hosting the React app and Worker API. Use one SQLite-backed Durable Object per generated room code as the source of truth. Each object stores room data and sets an alarm for 30 days after creation. When the alarm fires, the object deletes live app data.

## Consequences
- Room mutations are strongly coordinated within a single Durable Object.
- The v1 app avoids separate database cleanup jobs.
- Cross-room reporting is intentionally out of scope.
- Product copy promises deletion from the live app after 30 days, not verified provider-backup erasure.
