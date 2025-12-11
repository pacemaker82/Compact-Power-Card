# Compact-Power-Card

<img width="509" height="209" alt="Screenshot 2025-12-11 at 09 09 14" src="https://github.com/user-attachments/assets/b09648a2-8364-40b7-84fb-2475cc28d631" />

<img width="513" height="211" alt="Screenshot 2025-12-10 at 12 27 40" src="https://github.com/user-attachments/assets/14b4b3f4-6fa3-4aa6-b56c-87ccf567c58d" />

<img width="478" height="198" alt="Screenshot 2025-12-11 at 09 00 40" src="https://github.com/user-attachments/assets/c25e187b-ed8a-4973-aa86-eb7f367f29c3" />

A compact power card for Home Assistant that supports a tighter user experience, as well as 8 sources of power from the home in a single card. In addition, can show 6 entity labels for whatever you want, colour them how you need.

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
```
- type: custom:compact-power-card
  entities:
    pv:
      entity: sensor.pv_power
      color: var(--energy-solar-color)
      threshold: 20
      decimal_places: 0
      labels:
        - entity: sensor.pv_energy_total_kwh
          icon: mdi:solar-power-variant-outline
        - entity: sensor.pv_energy_today_kwh
          icon: mdi:solar-power-variant-outline
          decimal_places: 2
          color: "#FFFFFF"
    grid:
      entity: sensor.grid_power
      invert_state_values: true
      labels:
        - entity: sensor.grid_voltage
          icon: mdi:lightning-bolt
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
