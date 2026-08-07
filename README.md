# Compact-Power-Card

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/total?label=Total%20Downloads) ![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/pacemaker82/compact-power-card/latest/total?label=Latest%20Version)

If you enjoy this card, please give it a [star on the github repository](https://github.com/pacemaker82/Compact-Power-Card). Thank you!

<img width="1043" height="640" alt="Screenshot 2025-12-24 at 07 39 40" src="https://github.com/user-attachments/assets/583dde65-2885-4cfb-8db0-d91a9ec7c580" />

Inspired by the excellent [power flow card plus](https://github.com/flixlix/power-flow-card-plus) - A compact power card for Home Assistant that supports a tighter user experience, labels and power devices in the home in a single card. Various elements are very customisable, see below for more. 

## Functionality

- Add Device power entities for the home that can help calculate the rest of home usage
- Add labels to show related info, like battery %, grid voltage, PV energy or whatever you want.
- Thresholds can be set on entities to fade out the entity label below the threshold.
- Home power is calculated by default based on the grid/power/battery. Alternatively, use a home power sensor.
- Home icon dynamically changes colour based on the power provided to it.
- Grid & Battery sensors expect +/- values for import/export or charge/discharge. These can be inverted if the default behaviour isn't what you want. You can also provide separate import/export and charge/discharge entities.
- Icons, colors and units can be customised.

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=pacemaker82&repository=Compact-Power-Card)

Custom Power Card should be available in the HACS store by default, simply search for it. If you cannot find it, follow the instructions below:

1. Goto HACS (if you dont have that installed, install HACS)
2. Add a custom repository
3. Add the URL to this repo: `https://github.com/pacemaker82/Compact-Power-Card` using the category `Dashboard` (used to be `Lovelace` pre HACS 2.0.0)
4. Go back to HACS and search for "compact power card" in the HACS store
5. Download and refresh
6. Goto dashboard, edit dashboard, select 'add card' button, and add the new custom Compact Power Card. Use the configuration below to setup.

## Getting Started

Before you dive in getting a complicated card all setup, start with the basics. In the card setup below, you have 3 power devices, grid, PV and battery. In this case, the home entity isn't provided, so the card will take care of the calculation itself. Also, please note how the battery section is slightly different due to the nature of supporting multiple battery setups:

```yaml
type: custom:compact-power-card
curve_factor: 1
entities:
  pv:
    entity: sensor.givtcp_pv_power
  grid:
    entity: sensor.givtcp_grid_power
  battery:
    - entity: sensor.givtcp_battery_power
```

## Managing the size of the card

This card is designed for the new [Home Assistant Sections UI](https://www.home-assistant.io/dashboards/sections/), introduced in 2024. This allows you to scale the card horizontally or vertically as you see fit. The card will dynamically resize to fit the rows and columns you setup in the card UI.

**Note:** Caps are in place for the default size of the card (12 columns, 3 rows): 2 Grid, 2 Battery, 4 PV labels, 8 Devices.

<img width="1000" height="741" alt="Screenshot 2025-12-18 at 10 41 00" src="https://github.com/user-attachments/assets/e0a1a5e2-8567-4c69-ad4e-c4cb7b0ec984" />

# Compact Power Card Settings (Quick Reference)

**Note:** All of these settings are available in the configuration UI (unless mentioned otherwise), details here for reference.

## Card-level

| Name           | Setting slug    | What it does                                                                                   |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| Threshold mode | `threshold_mode`| Chooses whether sub-threshold values are zeroed in math (`calculations`) or only dimmed (`display_only`). |
| Decimal places | `decimal_places`| Default decimal places for all labels/values unless overridden at the entity/label level. |
| Subtract devices from home | `subtract_devices_from_home` | If true, subtract summed devices from the home value. Default: `false`. |
| Power Unit Override | `power_unit`| Set to W, kW or mW |
| Curved Line Radius | `curve_factor`| Adjusts the curve radius. `0` to `5`, `1` is default. Set to `0` for straight lines. |
| Font Size Multiplier | `font_size_multiplier`| Multiplies text sizes on top of the automatic `--cpc-scale`. Default `1.0`. |
| Device Power Lines | `show_device_power_lines`| Set to `true` to light up devices when power is flowing beyond a threshold. Default `false` |
| Device sort | `device_sort`| Sort visible devices left-to-right. Options: `none`, `power_desc`, `power_asc`, `name_desc`, `name_asc`. Default `none`. |
| Home Icon Gradient | `disable_home_gradient`| Set to `true` if you want the home icon to be a single colour. |
| Remove Glow Effects | `remove_glow_effects`| Set to `true` to disable drop shadow/glow effects. Default `false` (dark mode only). |
| Hide Card Background | `hide_card_background`| Set to `true` to hide the standard HA card background. Default `false`. |

### Thresholds in detail

The following rules are always true:

- Thresholds determine the opacity entity label (faded when below threshold)
- Thresholds determine the animation and appearance of power flow lines (off when below threshold)

However, in `calculations` mode (default):

- If threshold isn't met, then the raw power value of the entity is set to 0. This means that the entity essentially will not be part of any power calculations if the threshold isn't met. 

If you always want the power calculations to use the raw entity values, set `threshold_mode: display_only`

Example:
```yaml
type: custom:compact-power-card
threshold_mode: display_only
curve_factor: 5
```

## Entities
Common keys for `pv`, `grid`, `home`, `battery`. The following settings are possible:

| Name                | Setting slug            | What it does                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Entity              | `entity`                | Sensor/entity id used for values.                                               |
| Color               | `color`                 | Overrides line/icon/text color for that entity.                                 |
| Threshold           | `threshold`             | Values below this are zeroed (per `threshold_mode`) and dimmed. A threshold of `0` suppresses `0` and negative values.                 |
| Decimals            | `decimal_places`        | Number of decimals to display (defaults to card-level `decimal_places`, or 1).                                      |
| Unit override       | `unit` / `unit_of_measurement` | Converts `W` to `kW` if set to `kW`         |
| Invert state values | `invert_state_values`   | Flip positive/negative for the grid/battery readings      |
| Tap Action | `tap_action`   | Set to `more-info` or `navigate`. `navigate` requires a `navigation_path`. Default behaviour is `more-info`     |
| Navigation Path | `navigation_path`   | Used with `tap_action: navigate`. Set to a local path to go to a dashboard, e.g. `/my-dashboard/page`     |

### Separate Entities for Grid or Battery:

If you don't have a single entity for grid or battery power, you can instead use separate entities for both. This is not part of the configuration UI, it can only be added as YAML manually to the card. 

**For Grid:**

| Name                | Setting slug            | What it does                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Import Entity              | `import_entity`                | Sensor defining the import power from the grid. |
| Export Entity              | `export_entity`                | Sensor defining the export power to the grid. |

**For Battery** (can be provided for each battery):

| Name                | Setting slug            | What it does                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Charge Entity              | `charge_entity`                | Sensor defining the charge power to the battery. |
| Discharge Entity              | `discharge_entity`                | Sensor defining the discharge power from the battery. |   

Example:

```yaml
type: custom:compact-power-card
entities:
  pv:
    entity: sensor.givtcp_pv_power
  battery:
    - charge_entity: sensor.givtcp_charge_power
      discharge_entity: sensor.givtcp_discharge_power
    - charge_entity: sensor.givtcp_charge_power_battery2
      discharge_entity: sensor.givtcp_discharge_power_battery2      
  grid:
    import_entity: sensor.givtcp_import_power
    export_entity: sensor.givtcp_export_power
    decimal_places: 1
    threshold: 0
```

### Battery Only Settings:

| Name                | Setting slug            | What it does                                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Battery SoC Entity | `battery_soc`   | Sensor/entity id for the battery SoC. Only use under `battery` entity.     |
| Show SoC            | `show_soc`              | If true, appends `| {soc}%` to the battery power label when a SoC source is configured. Default: false. |
| Capacity          | `battery_capacity`              | Set the capacity of the battery in kWh, e.g. `9.5` |

Example of a basic setup, note how battery is slightly different YAML as the card supports multiple batteries:

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
    - entity: sensor.givtcp_battery_power
      battery_soc: sensor.battery_soc
      show_soc: true
```

The card supports many combinations: PV/Grid/Home/Battery, PV/Grid/Home, Battery/Grid/Home, Grid/Home

### Supporting multiple batteries

The card can support more than 1 battery. Each battery can have a soc and capacity entity too.

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
- If `home` entity is provided, the card displays its raw value (minus any device sensor power usage if applicable), but it will not consider its value in any other power calculations. If the entity is omitted, home is inferred from pv/grid/battery power, minus any device power (if applicable). See devices below for more on including their power in the home calculation.

## Devices

Devices are power feeds within your home that you want to show in the card. By default, device power is not subtracted from the home power value. If you want that to happen, set the card-level `subtract_devices_from_home: true`. You can override this per device with `subtract_from_home` (omit it to inherit the card-level setting).

**Important:** Any entity can be used in the device section to show icon/label, but only entities with `device_class: power` will be subtracted from the home power if `subtract_devices_from_home: true`. In addition, only devices with `device_class: power` will show power flow lines in the devices section. 

<img width="746" height="97" alt="Screenshot 2026-01-03 at 07 34 56" src="https://github.com/user-attachments/assets/e19c6c40-aec6-456c-80ac-3b307d663f3b" />

**Important:** You can add as many devices as you want, however the display of them is determined by the card width, 12 columns = up to 8 devices, 24 columns = up to 16 devices. On small screens (phones) this will still be limited to 8 devices, unless in landscape mode where you should have more real estate.

Set the card-level `device_sort` option to order visible devices left-to-right by power or name.

| Name                    | Setting slug                      | What it does                                                                     |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| Device entity           | `entity`                | Sensor/entity id for a load.                                          |
| Device attribute        | `attribute`             | Read from an attribute instead of state.                                         |
| Switch Entity        | `switch_entity`             | Will toggle the on/off of the switch when pressing the icon/label.                                         |
| Name Label            | `name`                  | Show a label for each device. Can use either a string or entity ID. Only works with card set to 4 or more rows in height in the sections UI. [See here](https://github.com/pacemaker82/Compact-Power-Card#managing-the-size-of-the-card) for more                                              |
| Icon             | `icon`                  | Optional icon for the device badge.                                              |
| Color            | `color`                 | Optional color override for that device.                                         |
| Threshold        | `threshold`             | Dims/zeros device below threshold (in watts) (per `threshold_mode`). A threshold of `0` suppresses `0` and negative values.                        |
| Subtract from home | `subtract_from_home` | `true` or `false` - Overrides card-level `subtract_devices_from_home` for this device. |
| Force hide under threshold | `force_hide_under_threshold` | If true, hides the device entirely when under threshold. Will hide at 0 W if no threshold set. |
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
      switch_entity: switch.car_charger
      name: Polestar
    - entity: sensor.pool_pump_power
      icon: mdi:pool
      threshold: 50
      subtract_from_home: false
    - entity: climate.garage
      attribute: temperature
      unit: "C"
      threshold: 50
```

## Labels (per pv/grid/battery)

Labels can be used to display "other" information - that can be more power stats, energy stats, weather, whatever you want. Note: these are just labels, they do not factor into the power diagram or calculations at all. 

**Important:** You can add as many labels as you want, however the display of them is determined by the card size width and height. Defaults for a 12 column, 3 row card are 2 labels for grid and battery, 4 labels for PV. Max 8 labels for PV on small screens like phones, the rest are hidden.

| Name          | Setting slug                 | What it does                                                         |
| ------------- | ---------------------------- | -------------------------------------------------------------------- |
| Labels list   | `labels`                     | Array of labels objects.                                             |
| Label entity  | `entity`            | Sensor/entity id for the label value.                                |
| Label attribute | `attribute`       | Read from an attribute instead of state.                             |
| Label name | `name`       | PV only. Add a name to the label. Ensure card is >= 4 rows in height.                              |
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

Battery labels are setup differently (due to the nature of supporting multi-battery setups):

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

## An important note on unlimited devices and labels...

**Important:** you must increase the size of the card to see more labels/devices. Just adding them to the card configuration / YAML is not enough, the card hides them if rows/column minimums aren't met.

There are cap limits in place for the default size of the card (12 columns, 3 rows): 2 Grid, 2 Battery, 4 PV labels, 8 Devices.

**Note:** There are of course theoretical limits due to the size of the cards which I cannot really avoid without making the UI tiny. In testing I am seeing 8 devices and PV labels for every 12 columns used, in theory grid and battery labels should be unlimited if you keep growing the card height. 

**Another Note:** On small screens (phones), the width of wide cards is squeezed small - in this case a max of 8 PV labels or devices will be shown in the UI. 

**Reminder:** Card resizing is [managed using sections](https://github.com/pacemaker82/Compact-Power-Card#managing-the-size-of-the-card).

**Your mileage may vary with limitless labels and devices. It can lead to overlapping labels or other undesirable effects as there are so many possible scenarios that I can't really control.**

## Unit & Formatting behavior
- W values auto-convert to kW when ≥ 1000 W, unless `power_unit` is forcing to `W`.
- kWh values auto-convert to MWh when ≥ 1000 kWh.
- `decimal_places` can be set at the card level and overridden per entity/label.
- Watts always display with 0 decimal places.
- `threshold` should be set in watts on power entities.

## Card Configuration Example:

The following example shows a mixed configuration of power devices, labels and additional power so you can get the idea. 

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
    - entity: sensor.battery_power
      invert_state_values: false
      threshold: 25
  battery_labels:
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
