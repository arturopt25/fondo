# ADR 0003: Integer Minor Units

## Status

Accepted

## Decision

Store monetary values as signed integers in minor units in a canonical USD ledger, while allowing USD or EUR as a presentation currency.

## Rationale

Integer arithmetic avoids floating-point errors. Keeping the ledger in USD avoids inaccurate multi-currency writes in the MVP. A typed exchange-rate provider can convert current balances and historical reports without rewriting financial records.
