# Compact-Power-Card

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/total?label=Total%20Downloads) ![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/latest/total?label=Latest%20Version)

<img width="509" height="209" alt="Screenshot 2025-12-11 at 09 09 14" src="https://github.com/user-attachments/assets/b09648a2-8364-40b7-84fb-2475cc28d631" />

<img width="513" height="211" alt="Screenshot 2025-12-10 at 12 27 40" src="https://github.com/user-attachments/assets/14b4b3f4-6fa3-4aa6-b56c-87ccf567c58d" />

<img width="478" height="198" alt="Screenshot 2025-12-11 at 09 00 40" src="https://github.com/user-attachments/assets/c25e187b-ed8a-4973-aa86-eb7f367f29c3" />

Inspired by the excellent [power flow card plus](https://github.com/flixlix/power-flow-card-plus) - A compact power card for Home Assistant that supports a tighter user experience, and 8 sources of power from the home in a single card. In addition, the card can show 6 entity labels for whatever you want, colour and configure them how you need.

## Functionality

- Upto 8 power measurement entities for the home that help calculate the rest of home usage
- Upto 6 additional state labels to show related info, like battery %, grid voltage, PV energy or whatever you want.
- Thresholds can be set on entities to fade out / hide the entity below the threshold.
- Home power is calculated by default based on the grid/power/battery. You can force the raw state of the home sensor using config.
- Grid, Home and Battery are mandatory sensors needed at this time. PV is optional.
- Grid & Battery sensors expect +/- values for import/export or charge/discharge. These can be inverted if the default behaviour isn't what you want.
- Icons and Colors can be overriden.

## Installation

1. Goto HACS (if you dont have that installed, install HACS)
2. Add a custom repository
3. Add the URL to this repo: `https://github.com/pacemaker82/Compact-Power-Card` using the category `Dashboard` (used to be `Lovelace` pre HACS 2.0.0)
4. Go back to HACS and search for "compact power card" in the HACS store
5. Download and refresh
6. Goto dashboard, edit dashboard, select 'add card' button, and add the new custom Compact Power Card. Use the configuration below to setup.

## Card Configuration:
```yaml
type: custom:compact-power-card
threshold_mode: calculations
entities:
  pv:
    entity: sensor.solar_power
    color: var(--energy-solar-color)
    threshold: 50                   
    decimal_places: 1
    labels:                         
      - entity: sensor.solar_energy_today
        unit: kWh
        color: "#ffb300"             
  grid:
    entity: sensor.grid_power
    invert_state_values: false
    threshold: 25
    labels:
      - entity: sensor.grid_voltage
        icon: mdi:lightning-bolt 
        unit: V
  home:
    entity: sensor.home_power
    decimal_places: 1
  battery:
    entity: sensor.battery_power
    invert_state_values: false
    threshold: 25
    labels:
      - entity: sensor.battery_soc
        unit: "%"
  sources:
    subtract_from_home: true 
    list:
      - entity: sensor.ev_charger_power
        icon: mdi:car-electric
        threshold: 50
        color: "#FFFFFF"
      - entity: sensor.pool_pump_power
        icon: mdi:pool
        threshold: 50
      - entity: climate.garage
        attribute: temperature
        unit: "C"
        icon: mdi:pool
        threshold: 50
```

# Compact Power Card Settings (Quick Reference)

## Card-level
- `threshold_mode` (default `calculations`): `calculations` zeroes sub-threshold values in both math and display; `display_only` keeps raw values in calculations and only dims/hides flows/labels based on thresholds.

| Name           | Setting slug    | What it does                                                                                   |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| Threshold mode | `threshold_mode`| Chooses whether sub-threshold values are zeroed in math (`calculations`) or only dimmed (`display_only`). |

In display_only mode:

- Thresholds determine the opacity of the icon and labels (faded when below threshold)
- Thresholds determine the animation of power flow lines (off when below threshold)
- If home entity isn't provided: Home calculation is based on the raw values from PV, Grid, Battery and auxiliary sources (unless `sources.subtract_from_home: false`)
- If home entity is provided: Home calculation is based on the home entity state, minus the auxiliary sources by default (see `sources.subtract_from_home`)

In calculation mode:

- Thresholds determine the opacity of the icon and labels (faded when below threshold)-
- Thresholds determine the animation of power flow lines (off when below threshold)
- If threshold isn't met, then the raw value is 0
- If home entity isn't provided: Home calculation is based on the raw values from PV, Grid, Battery and auxiliary sources (unless `sources.subtract_from_home: false`)
- If home entity is provided: Home calculation is based on the home entity state, minus the auxiliary sources by default (see `sources.subtract_from_home`)

## Entities
Common keys for `pv`, `grid`, `home`, `battery`:
- `entity`: sensor/entity id providing the value.
- `color`: override line/icon/text color.
- `threshold`: numerical cutoff; values below are treated as zero (per `threshold_mode`) and dimmed.
- `decimal_places`: number of decimals shown (default 1).
- `unit` or `unit_of_measurement`: display-only unit override (does not affect math).
- `invert_state_values` (`grid`/`battery` only): flip sign of the reading.

Home-specific:
- If `home.entity` is provided, the card uses its value (minus aux usage); if omitted, home is inferred from pv/grid/battery minus aux.

| Name                | Setting slug            | What it does                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Entity              | `entity`                | Sensor/entity id used for values.                                               |
| Color               | `color`                 | Overrides line/icon/text color for that entity.                                 |
| Threshold           | `threshold`             | Values below this are zeroed (per `threshold_mode`) and dimmed.                 |
| Decimals            | `decimal_places`        | Number of decimals to display (default 1).                                      |
| Unit override       | `unit` / `unit_of_measurement` | Display-only unit override; math always uses raw numeric values.         |
| Invert state values | `invert_state_values`   | Flip sign of grid/battery readings (e.g., import/export, charge/discharge).     |
| Home entity use     | `home.entity`           | If present, use the home sensor (optionally minus aux); if absent, infer home.  |

## Labels (per pv/grid/battery)
- `labels`: array (max 2) of objects:
  - `entity`: sensor/entity id.
  - `attribute` (optional): read value from an attribute instead of state.
  - `icon`, `color`, `threshold`, `decimal_places`, `unit|unit_of_measurement` (display unit override).

| Name          | Setting slug                 | What it does                                                         |
| ------------- | ---------------------------- | -------------------------------------------------------------------- |
| Labels list   | `labels`                     | Array (max 2) of label objects.                                     |
| Label entity  | `labels[].entity`            | Sensor/entity id for the label value.                                |
| Label attribute | `labels[].attribute`       | Read from an attribute instead of state.                             |
| Label icon    | `labels[].icon`              | Optional icon shown next to the label.                               |
| Label color   | `labels[].color`             | Optional color override for the label text/icon.                     |
| Label threshold | `labels[].threshold`       | Dims/hides label when below threshold (per `threshold_mode`).        |
| Label decimals | `labels[].decimal_places`   | Decimal places for that label.                                       |
| Label unit    | `labels[].unit` / `labels[].unit_of_measurement` | Display unit override for that label.                    |

## Aux sources
- `sources`: array (max 8) of objects, or an object with `list|items|entities` containing that array and optional options:
  - `entity`: sensor/entity id.
  - `attribute` (optional): read value from an attribute.
  - `icon`, `color`, `threshold`, `decimal_places`, `unit|unit_of_measurement`.
  - `threshold_mode` applies to sources for calculations (home inference) and opacity.
  - `subtract_from_home` (default `true`): subtract summed auxiliary usage from the home value/calculation. Set `false` to leave the home value untouched by auxiliary sources.

| Name                    | Setting slug                      | What it does                                                                     |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| Sources wrapper         | `sources`                         | Array of aux items, or object with `list|items|entities` plus options.           |
| Source entity           | `sources[].entity`                | Sensor/entity id for an auxiliary load.                                          |
| Source attribute        | `sources[].attribute`             | Read from an attribute instead of state.                                         |
| Source icon             | `sources[].icon`                  | Optional icon for the source badge.                                              |
| Source color            | `sources[].color`                 | Optional color override for that source.                                         |
| Source threshold        | `sources[].threshold`             | Dims/zeros source below threshold (per `threshold_mode`).                        |
| Source decimals         | `sources[].decimal_places`        | Decimal places for that source.                                                  |
| Source unit             | `sources[].unit` / `sources[].unit_of_measurement` | Display unit override for that source.                       |
| Sources threshold mode  | `sources.threshold_mode`          | Optional override for how thresholds apply to sources.                           |
| Subtract from home      | `sources.subtract_from_home`      | If true (default), subtract summed aux usage from home value/calculation.        |

## Unit & formatting behavior
- kWh values auto-convert to MWh when ≥ 1000 kWh.
- `decimal_places` controls formatting everywhere the value is shown.
- `unit|unit_of_measurement` overrides display text only; calculations always use numeric state/attribute.

| Name              | Setting slug/behavior        | What it does                                                            |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Auto kWh → MWh    | (behavior)                  | Converts kWh values ≥ 1000 to MWh for display.                          |
| Decimal places    | `decimal_places`            | Controls decimal precision for displayed values.                        |
| Unit override     | `unit` / `unit_of_measurement` | Overrides displayed unit only; math still uses raw numeric state.    |

## Visibility rules
- PV visuals hide when `pv` key is absent.
- Opacity for each entity/label follows its `threshold` and the global `threshold_mode`.

| Name               | Setting slug/behavior | What it does                                                         |
| ------------------ | --------------------- | -------------------------------------------------------------------- |
| PV visibility      | (behavior)            | Hides PV visuals when `entities.pv` is not provided.                 |
| Threshold opacity  | `threshold` / `threshold_mode` | Dims/hides flows and labels when below thresholds per mode.   |
