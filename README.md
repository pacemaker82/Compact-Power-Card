# Compact-Power-Card

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/total?label=Total%20Downloads) ![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/latest/total?label=Latest%20Version)

<img width="509" height="209" alt="Screenshot 2025-12-11 at 09 09 14" src="https://github.com/user-attachments/assets/b09648a2-8364-40b7-84fb-2475cc28d631" />

<img width="513" height="211" alt="Screenshot 2025-12-10 at 12 27 40" src="https://github.com/user-attachments/assets/14b4b3f4-6fa3-4aa6-b56c-87ccf567c58d" />

<img width="478" height="198" alt="Screenshot 2025-12-11 at 09 00 40" src="https://github.com/user-attachments/assets/c25e187b-ed8a-4973-aa86-eb7f367f29c3" />

Inspired by the excellent [power flow card plus](https://github.com/flixlix/power-flow-card-plus) - A compact power card for Home Assistant that supports a tighter user experience, and 8 sources of power from the home in a single card. In addition, the card can show 6 entity labels for whatever you want, colour and configure them how you need.

## Functionality

- Up to 8 power measurement entities for the home that help calculate the rest of home usage
- Up to 6 additional state labels to show related info, like battery %, grid voltage, PV energy or whatever you want.
- Thresholds can be set on entities to fade out / hide the entity below the threshold.
- Home power is calculated by default based on the grid/power/battery. Alternatively, use a home power sensor.
- Grid & Battery sensors expect +/- values for import/export or charge/discharge. These can be inverted if the default behaviour isn't what you want.
- Icons, colors and units can be customised.

## Installation

1. Goto HACS (if you dont have that installed, install HACS)
2. Add a custom repository
3. Add the URL to this repo: `https://github.com/pacemaker82/Compact-Power-Card` using the category `Dashboard` (used to be `Lovelace` pre HACS 2.0.0)
4. Go back to HACS and search for "compact power card" in the HACS store
5. Download and refresh
6. Goto dashboard, edit dashboard, select 'add card' button, and add the new custom Compact Power Card. Use the configuration below to setup.

## Getting Started

Before you dive in getting a complicated card all setup, start with the basics. In the card setup below, you have 3 sources of power, grid, PV and battery. In this case, the home entity isn't provided, so the card will take care of the calculation itself:

```yaml
type: custom:compact-power-card
entities:
  pv:
    entity: sensor.givtcp_pv_power
    decimal_places: 2
  grid:
    entity: sensor.givtcp_grid_power
    decimal_places: 2
  battery:
    entity: sensor.givtcp_battery_power
    decimal_places: 2
```

# Compact Power Card Settings (Quick Reference)

## Card-level

| Name           | Setting slug    | What it does                                                                                   |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| Threshold mode | `threshold_mode`| Chooses whether sub-threshold values are zeroed in math (`calculations`) or only dimmed (`display_only`). |
| Card Height Factor | `height_factor`| Default: 1.0, set it if you want the height of the card to be bigger, e.g. 1.5, 2.0 |

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

Example:
```yaml
type: custom:compact-power-card
threshold_mode: display_only
```

## Entities
Common keys for `pv`, `grid`, `home`, `battery`. The following settings are possible:

| Name                | Setting slug            | What it does                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Entity              | `entity`                | Sensor/entity id used for values.                                               |
| Color               | `color`                 | Overrides line/icon/text color for that entity.                                 |
| Threshold           | `threshold`             | Values below this are zeroed (per `threshold_mode`) and dimmed.                 |
| Decimals            | `decimal_places`        | Number of decimals to display (default 1).                                      |
| Unit override       | `unit` / `unit_of_measurement` | Display-only unit override; math always uses raw numeric values.         |
| Invert state values | `invert_state_values`   | Flip sign of grid/battery readings (e.g., import/export, charge/discharge).     |

Example of a basic setup:

```yaml
entities:
  pv:
    entity: sensor.solar_power  
    color: "#ffea07"          
  grid:
    entity: sensor.grid_power
    threshold: 100
  home:
    entity: sensor.home_power
  battery:
    entity: sensor.battery_power
```

The card supports many combinations: PV/Grid/Home/Battery, PV/Grid/Home, Battery/Grid/Home, Grid/Home

### Supporting multiple batteries

The card will support more than 1 battery, this is experimental at the moment. Each battery can have a soc entity too. 

```yaml
entities:
  battery:
    - entity: sensor.battery_power_1
    - entity: sensor.battery_power_2
    - entity: sensor.battery_power_3
      color: "#ff0000"
      battery_soc: sensor.battery_soc
```

### Home specific
- If `home` is provided, the card uses its value (minus any aux sensor power usage); if omitted, home is inferred from pv/grid/battery power, minus any aux power sources. (see aux sources below for more)

## Aux sources

Aux sources are up to 8 power sources within your home that you want to show in the card. By default, their power values will be subtracted from the home power value. If you don't want that to happen, set `subtract_from_home` under `sources`.

| Name                    | Setting slug                      | What it does                                                                     |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| Source entity           | `entity`                | Sensor/entity id for an auxiliary load.                                          |
| Source attribute        | `attribute`             | Read from an attribute instead of state.                                         |
| Icon             | `icon`                  | Optional icon for the source badge.                                              |
| Color            | `color`                 | Optional color override for that source.                                         |
| Threshold        | `threshold`             | Dims/zeros source below threshold (in watts) (per `threshold_mode`).                        |
| Decimals         | `decimal_places`        | Decimal places for that source.                                                  |
| Unit of Measurement             | `unit` / `unit_of_measurement` | Display unit override for that source.                       |
| Subtract from home?      | `subtract_from_home`      | If true (default), subtract summed aux usage from home value/calculation.        |

Example below of how sources can be setup:

```yaml
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
        threshold: 50
```

## Labels (per pv/grid/battery)

Labels can be used to display "other" information - that can be more power stats, energy stats, weather, whatever you want. You can add two labels per main power source (e.g. Grid x2, PV x2, Battery x2) Note: these are just labels, they do not factor into the power diagram or calculations at all. 

| Name          | Setting slug                 | What it does                                                         |
| ------------- | ---------------------------- | -------------------------------------------------------------------- |
| Labels list   | `labels`                     | Array (max 2 for each) of label objects.                                     |
| Label entity  | `entity`            | Sensor/entity id for the label value.                                |
| Label attribute | `attribute`       | Read from an attribute instead of state.                             |
| Icon    | `icon`              | Optional icon shown next to the label.                               |
| Color   | `color`             | Optional color override for the label text/icon.                     |
| Threshold | `threshold`       | Dims/hides label when below threshold (in watts) (per `threshold_mode`).        |
| Decimals | `decimal_places`   | Decimal places for that label.                                       |
| Unit of Measurement    | `.unit` / `labels[].unit_of_measurement` | Display unit override for that label.                    |

Example of a label setup:

```yaml
  grid:
    entity: sensor.grid_power
    labels:
      - entity: sensor.grid_voltage
        icon: mdi:lightning-bolt 
        unit: V
      - entity: sensor.import_cost
        icon: mdi:currency-gbp
        unit: "p"        
```        

## Unit & Formatting behavior
- W values auto-convert to kW when ≥ 1000 W.
- kWh values auto-convert to MWh when ≥ 1000 kWh.
- `decimal_places` controls formatting everywhere the value is shown.
- `unit|unit_of_measurement` overrides display text only; calculations always use numeric state/attribute.
- `threshold` should be set based on the source unit of measurement. So "0.1" if kW versus "100" if watts.

## Card Configuration Example:

The following example shows a mixed configuration of power sources, labels and additional power. 

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
        threshold: 50
```
