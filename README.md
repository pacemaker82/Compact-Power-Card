# Compact-Power-Card

<img width="513" height="211" alt="Screenshot 2025-12-10 at 12 27 40" src="https://github.com/user-attachments/assets/14b4b3f4-6fa3-4aa6-b56c-87ccf567c58d" />

A compact power card for Home Assistant that supports a tighter user experience, as well as 8 sources of power from the home in a single card.

## Functionality

- Thresholds can be set on entities to fade out / hide the entity below the threshold.
- Home power is calculated by default based on the grid/power/battery. You can force the raw state of the home sensor using config.
- PV, Grid, Home and Battery are mandatory sensors needed at this time.
- Grid & Battery sensorrs expect +/- values for import/export or charge/discharge.
- Icons and Colors can be overriden.

## Card Configuration:
```
- type: custom:compact-power-card
  entities:
    pv:
      entity: sensor.pv_power
      color: var(--energy-solar-color)
      threshold: 20
    grid:
      entity: sensor.grid_power
    home:
      entity: sensor.load_power
      force_raw_state: false
    battery:
      entity: sensor._battery_power
      soc: sensor.battery_soc
    sources:
      - entity: sensor.shellyem_power
        threshold: 20
        icon: mdi:car-sports
      - entity: sensor.combined_heating_hot_water_power
        icon: mdi:water-boiler
        color: "#9c27b0"
        threshold: 1
      - entity: sensor.shelly_plug_1_power
        threshold: 1
      - entity: sensor.shelly_plug_2_power
        threshold: 1
```
