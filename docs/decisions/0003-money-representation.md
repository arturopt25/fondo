# ADR 0003: Integer Minor Units

## Status

Accepted

## Decision

Store monetary values as signed integers in minor units and store an ISO currency code with each financial record.

## Rationale

Integer arithmetic avoids floating-point errors. The MVP uses USD, while the currency field and future exchange-rate port preserve an extension path for multi-currency reporting.
