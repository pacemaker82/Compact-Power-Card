# Compact-Power-Card

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/total?label=Total%20Downloads) ![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/latest/total?label=Latest%20Version)

<img width="908" height="581" alt="Screenshot 2025-12-15 at 11 56 29" src="https://github.com/user-attachments/assets/a4ba6978-55f0-43a6-a15c-2c846be1e6bc" />

Inspired by the excellent [power flow card plus](https://github.com/flixlix/power-flow-card-plus) - A compact power card for Home Assistant that supports a tighter user experience, and 8 power devices/feeds from the home in a single card. In addition, the card can show 6 entity labels for whatever you want, colour and configure them how you need.

## Functionality

- Up to 8 device power entities for the home that can help calculate the rest of home usage
- Up to 6 additional state labels to show related info, like battery %, grid voltage, PV energy or whatever you want.
- Thresholds can be set on entities to fade out / hide the entity below the threshold.
- Home power is calculated by default based on the grid/power/battery. Alternatively, use a home power sensor.
- Grid & Battery sensors expect +/- values for import/export or charge/discharge. These can be inverted if the default behaviour isn't what you want.
- Icons, colors and units can be customised.

## Installation

Custom Power Card should be available in the HACS store by default, simply search for it. If you cannot find it, follow the instructions below:

1. Goto HACS (if you dont have that installed, install HACS)
2. Add a custom repository
3. Add the URL to this repo: `https://github.com/pacemaker82/Compact-Power-Card` using the category `Dashboard` (used to be `Lovelace` pre HACS 2.0.0)
4. Go back to HACS and search for "compact power card" in the HACS store
5. Download and refresh
6. Goto dashboard, edit dashboard, select 'add card' button, and add the new custom Compact Power Card. Use the configuration below to setup.

## Getting Started

Before you dive in getting a complicated card all setup, start with the basics. In the card setup below, you have 3 power devices, grid, PV and battery. In this case, the home entity isn't provided, so the card will take care of the calculation itself:

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
| Decimal places | `decimal_places`| Default decimal places for all labels/values unless overridden at the entity/label level. |
| Subtract devices from home | `subtract_devices_from_home` | If true, subtract summed devices from the home value. Default: `false`. |
| Power Unit Override | `power_unit`| set to W, kW or mW |

In display_only mode:

- Thresholds determine the opacity of the icon and labels (faded when below threshold)
- Thresholds determine the animation of power flow lines (off when below threshold)
- If home entity isn't provided: Home calculation is based on the raw values from PV, Grid, Battery and devices (only subtract if `subtract_devices_from_home: true`).
- If home entity is provided: Home calculation is based on the home entity state (only subtract if `subtract_devices_from_home: true`).

In calculation mode:

- Thresholds determine the opacity of the icon and labels (faded when below threshold)-
- Thresholds determine the animation of power flow lines (off when below threshold)
- If threshold isn't met, then the raw value is 0
- If home entity isn't provided: Home calculation is based on the raw values from PV, Grid, Battery and devices (only subtract if `subtract_devices_from_home: true`).
- If home entity is provided: Home calculation is based on the home entity state (only subtract if `subtract_devices_from_home: true`).

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
| Decimals            | `decimal_places`        | Number of decimals to display (defaults to card-level `decimal_places`, or 1).                                      |
| Unit override       | `unit` / `unit_of_measurement` | Converts `W` to `kW` if set to `kW`         |
| Invert state values | `invert_state_values`   | Flip sign of grid/battery readings (e.g., import/export, charge/discharge).     |

**Battery only:**

| Name                | Setting slug            | What it does                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Battery SoC Entity | `battery_soc`   | Sensor/entity id for the battery SoC. Only use under `battery` entity.     |
| Show SoC            | `show_soc`              | If true, appends `| {soc}%` to the battery power label when a SoC source is configured. Default: false. |
| Capacity          | `battery_capacity`              | Set the capacity of the battery in kWh, e.g. `9.5` |

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
    battery_soc: sensor.battery_soc
    show_soc: true
```

The card supports many combinations: PV/Grid/Home/Battery, PV/Grid/Home, Battery/Grid/Home, Grid/Home

### Supporting multiple batteries

The card will support more than 1 battery, this is experimental at the moment. Each battery can have a soc and capacity entity too.

The UI will calculate your % of battery available across multiple batteries. If you just provide the `battery_soc` it will be an average across the SoCs. If you also provide the `battery_capacity` it will calculate a weighted average across the batteries.

```yaml
entities:
  battery:
    - entity: sensor.battery_power_1
    - entity: sensor.battery_power_2
      battery_soc: sensor.battery_soc2
      battery_capacity: 9.5    
    - entity: sensor.battery_power_3
      color: "#ff0000"
      battery_soc: sensor.battery_soc3
      battery_capacity: 9.5
      show_soc: true
```

### Home specific
- If `home` is provided, the card uses its value (minus any device sensor power usage); if omitted, home is inferred from pv/grid/battery power, minus any device power. (see devices below for more)

## Devices

Devices are up to 8 power feeds within your home that you want to show in the card. By default, device power is not subtracted from the home power value. If you want that to happen, set the card-level `subtract_devices_from_home: true`.

| Name                    | Setting slug                      | What it does                                                                     |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| Device entity           | `entity`                | Sensor/entity id for a load.                                          |
| Device attribute        | `attribute`             | Read from an attribute instead of state.                                         |
| Icon             | `icon`                  | Optional icon for the device badge.                                              |
| Color            | `color`                 | Optional color override for that device.                                         |
| Threshold        | `threshold`             | Dims/zeros device below threshold (in watts) (per `threshold_mode`).                        |
| Decimals         | `decimal_places`        | Decimal places for that device (defaults to card-level `decimal_places`).                                                  |
| Unit of Measurement             | `unit` / `unit_of_measurement` | Converts `W` to `kW` if set to `kW`                    |

Example below of how devices can be setup:

```yaml
  subtract_devices_from_home: true
  devices:
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
| Threshold | `threshold`       | Dims/hides label when below threshold (per `threshold_mode`).        |
| Decimals | `decimal_places`   | Decimal places for that label (defaults to card-level `decimal_places`).                                       |
| Unit of Measurement    | `unit` / `unit_of_measurement` | Display unit override for that label, display only.                    |

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

**IMPORTANT**

If you setup multiple batteries, the 2x battery labels must be setup like this:

```yaml
  battery:
    - entity: input_number.battery_power_1
    - entity: input_number.battery_power_2
      unit: kW
      color: "#FFFFFF"
  battery_labels:
    - entity: sensor.tempest_air_density
    - entity: sensor.my_sensor
```

## Unit & Formatting behavior
- W values auto-convert to kW when ≥ 1000 W, unless `power_unit` is forcing to `W`.
- kWh values auto-convert to MWh when ≥ 1000 kWh.
- `decimal_places` can be set at the card level and overridden per entity/label.
- Watts always display with 0 decimal places.
- `threshold` should be set in watts on power entities.

## Card Configuration Example:

The following example shows a mixed configuration of power devices, labels and additional power. 

```yaml
type: custom:compact-power-card
threshold_mode: calculations
subtract_devices_from_home: true
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
  devices:
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
