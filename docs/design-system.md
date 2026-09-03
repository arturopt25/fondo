# Fondo Design System

Fondo uses a compact financial instrument panel visual language: deep canvas surfaces, a restrained grid, electric cyan accents, monospaced figures and editorial page hierarchy.

## Tokens

- `color.canvas`: application background.
- `color.surface`: cards and navigation surfaces.
- `color.surfaceRaised`: overlays and elevated panels.
- `color.accent`: primary cyan action color.
- `color.positive`: income and healthy progress.
- `color.negative`: expenses and destructive states.
- `color.warning`: budget thresholds and attention states.
- `font.ui`: readable interface typography.
- `font.data`: tabular figures, rates and financial labels.
- `space.*`: consistent Mantine spacing scale.
- `radius.*`: compact card and control radii.
- `border.*`: low-contrast separators and focused boundaries.
- `shadow.*`: restrained depth for cards and overlays.

## Shared components

- `FondoBrand`
- `MetricCard`
- `DashboardSection`
- `PageHeader`
- `EmptyState`
- `CurrencyAmount`
- `ServiceCard`

The web app owns route-aware components such as `AppLayout` and `DateRangeSelector`. Components expose loading, empty, error and disabled states instead of assuming a successful API response.

## Currency presentation

Mock financial data is stored in USD minor units. `MockExchangeRateProvider` behavior is represented by the typed mock exchange rate in the personal finance module. Production conversion will move behind an API-backed provider without changing the UI contracts.
