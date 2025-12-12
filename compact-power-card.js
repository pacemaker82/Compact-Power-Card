class CompactPowerCard extends (window.LitElement ||
  Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))) {

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  constructor() {
    super();
    this._hass = null;
    this._flowAnimations = {};
    this._homeEffective = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) {
      this._updateFlows();
      this.requestUpdate();
    }
  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    if (
      !config.entities ||
      typeof config.entities !== "object" ||
      Array.isArray(config.entities)
    ) {
      throw new Error(
        "compact-power-card: 'entities' must be an object with keys pv, grid, home, battery"
      );
    }
    this._config = config;
  }

  static get styles() {
    return this.css`
      ha-card {
        box-sizing: border-box;
        padding: 0 4px 2px;
        background: transparent;
        box-shadow: none;
        position: relative;
      }

      svg {
        width: 100%;
        height: auto;
        display: block;
      }

      text {
        font-family: inherit;
      }

      .flow-line {
        stroke-width: 2;
        stroke-linecap: round;
        stroke: #7a7a7a;
        stroke-opacity: 0.15;
        transition: stroke 0.3s ease, stroke-opacity 0.3s ease;
      }

      .pv-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 10px;
        margin-bottom: 0;
        gap: 2px;
      }

      .pv-label {
        font-size: 13px;
      }

      .node-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 4px;
        user-select: none;
      }

      .pv-marker {
        gap: 0px;
      }

      .pv-marker .node-label {
        transform: translateY(4px);
      }

      .node-marker.left {
        align-items: flex-start;
      }

      .node-marker.right {
        align-items: flex-end; /* keep battery icon pinned right while label grows */
      }

      .battery-marker {
        gap: 0;
        position: relative;
      }

      .grid-marker {
        gap: 0;
      }

      .node-marker ha-icon {
        --mdc-icon-size: 26px;
        filter: drop-shadow(0 0 0 rgba(0,0,0,0));
      }

      .node-label {
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 2px;
        margin-top: -4px;
      }

      .value-number {
        font-weight: 700;
      }

      .value-unit {
        font-weight: 400;
      }

      .node-label.left {
        justify-content: flex-start;
        text-align: left;
        align-self: flex-start;
      }

      .node-label.right {
        justify-content: flex-end;
        text-align: right;
        align-self: flex-end;
        width: auto;
        max-width: 100%;
      }

      .node-label ha-icon {
        --mdc-icon-size: 12px;
      }

      .home-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        user-select: none;
      }

      .home-marker ha-icon {
        --mdc-icon-size: 60px;
        filter: drop-shadow(0 0 0 1px var(--primary-text-color, #000));
      }

      .home-label {
        font-size: 13px;
        font-weight: 700;
        margin-top: -10px;
      }

      .aux-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        user-select: none;
      }

      .aux-marker ha-icon {
        --mdc-icon-size: 24px;
      }

      .aux-label {
        font-size: 10px;
      }

      .pv-label,
      .node-label,
      .home-label,
      .aux-label,
      .battery-soc {
        padding: 2px 4px;
        border-radius: 4px;
        white-space: nowrap;
      }

      .clickable {
        cursor: pointer;
      }

      .canvas {
        position: relative;
        width: 100%;
      }

      .overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .overlay-item {
        position: absolute;
        transform: translate(-50%, -50%);
        pointer-events: auto;
      }

      /* Anchor helpers so labels grow away from the icon */
      .overlay-item.anchor-right {
        transform: translate(-100%, -50%);
      }

      .overlay-item.anchor-left {
        transform: translate(0, -50%);
      }

      :host(.no-battery) #line-pv-battery,
      :host(.no-battery) #line-home-battery,
      :host(.no-battery) #arc-grid-battery,
      :host(.no-battery) #dot-pv-battery,
      :host(.no-battery) #dot-grid-battery,
      :host(.no-battery) #dot-battery-home,
      :host(.no-battery) #dot-battery-grid,
      :host(.no-battery) .battery-section,
      :host(.no-battery) .battery-label,
      ha-card.no-battery #line-pv-battery,
      ha-card.no-battery #line-home-battery,
      ha-card.no-battery #arc-grid-battery,
      ha-card.no-battery #dot-pv-battery,
      ha-card.no-battery #dot-grid-battery,
      ha-card.no-battery #dot-battery-home,
      ha-card.no-battery #dot-battery-grid,
      ha-card.no-battery .battery-section,
      ha-card.no-battery .battery-label {
        display: none;
      }

      :host(.no-pv) .canvas,
      ha-card.no-pv .canvas {
        margin-top: -44px;
      }

      :host(.no-pv) #line-pv-grid,
      :host(.no-pv) #line-pv-home,
      :host(.no-pv) #line-pv-battery,
      :host(.no-pv) #dot-pv-home,
      :host(.no-pv) #dot-pv-grid,
      :host(.no-pv) #dot-pv-battery,
      :host(.no-pv) .pv-section,
      ha-card.no-pv #line-pv-grid,
      ha-card.no-pv #line-pv-home,
      ha-card.no-pv #line-pv-battery,
      ha-card.no-pv #dot-pv-home,
      ha-card.no-pv #dot-pv-grid,
      ha-card.no-pv #dot-pv-battery,
      ha-card.no-pv .pv-section {
        display: none;
      }
    `;
  }

  updated(changedProps) {
    if (super.updated) super.updated(changedProps);
    this._adjustLayout();
  }

  _adjustLayout() {
    const root = this.shadowRoot;
    if (!root) return;
    const header = root.querySelector(".pv-header");
    const svg = root.querySelector("svg");
    const line = root.getElementById("line-pv-home");
    if (!header || !svg || !line) return;

    svg.style.marginTop = "0px";

    const headerBox = header.getBoundingClientRect();
    const lineBox = line.getBoundingClientRect();
    const gap = lineBox.top - headerBox.bottom;

    const desiredGap = 12;
    const delta = gap - desiredGap;

    svg.style.marginTop = `${-delta}px`;
  }

  _getEntityConfig(kind) {
    const ents = this._config?.entities || {};
    const raw = ents[kind];
    if (!raw) return { entity: null };
    if (typeof raw === "string") return { entity: raw };
    if (typeof raw === "object") {
      return { entity: raw.entity || null, color: raw.color, ...raw };
    }
    return { entity: null };
  }

  _normalizeLabels(labels) {
    if (!labels) return [];
    const arr = Array.isArray(labels) ? labels : [labels];
    return arr
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") return { entity: item };
        if (typeof item === "object") {
          const entity =
            item.entity ||
            item.entity_id ||
            item.id ||
            item.name ||
            item.source ||
            item.src ||
            item.label;
          if (!entity) return null;
          return {
            entity,
            icon: item.icon,
            color: item.color,
            unit: item.unit,
            ...item,
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 2);
  }

  _normalizeSources(list) {
    return (Array.isArray(list) ? list : [])
      .map((raw) => {
        if (typeof raw === "string") return { entity: raw };
        if (typeof raw === "object" && raw) {
          const explicit =
            raw.entity || raw.entity_id || raw.id || raw.name || raw.source || raw.src;
          if (explicit) return { ...raw, entity: explicit };
          const keys = Object.keys(raw || {}).filter(
            (k) => !["threshold", "color", "icon"].includes(k)
          );
          if (keys.length === 1) return { ...raw, entity: keys[0] };
          return null;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  _coerceBoolean(val, defaultVal = false) {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === "string") {
      const lower = val.toLowerCase().trim();
      if (["false", "off", "0", "no"].includes(lower)) return false;
      if (["true", "on", "1", "yes"].includes(lower)) return true;
    }
    return Boolean(val);
  }

  _getSourcesConfig() {
    const raw = this._config?.entities?.sources;
    let subtractFromHome = true;
    let list = [];

    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === "object") {
      if (Object.prototype.hasOwnProperty.call(raw, "subtract_from_home")) {
        subtractFromHome = this._coerceBoolean(raw.subtract_from_home, true);
      }
      if (Array.isArray(raw.list)) list = raw.list;
      else if (Array.isArray(raw.items)) list = raw.items;
      else if (Array.isArray(raw.entities)) list = raw.entities;
      else if (Array.isArray(raw.sources)) list = raw.sources;
    }

    return { sources: this._normalizeSources(list), subtractFromHome };
  }

  _getColor(kind, entityCfg) {
    const cfg = this._config || {};
    const colors = cfg.colors || {};

    const defaults = {
      pv: "var(--energy-solar-color)",
      grid: "rgb(79, 114, 154)",
      home: "rgb(107, 180, 172)",
      battery: "#f06292",
    };

    return (
      entityCfg?.color ||
      colors[kind] ||
      cfg[`${kind}_color`] ||
      defaults[kind]
    );
  }

  _isLightTheme() {
    const theme = this.hass?.themes;
    if (theme?.darkMode === false) return true;
    if (theme?.darkMode === true) return false;
    return document?.body?.classList?.contains("theme-light") || false;
  }

  _formatEntity(entityId, decimals = 1, attribute = null, unitOverride = null) {
    if (!this.hass || !entityId) return "";
    const obj = this.hass.states[entityId];
    if (!obj) return "";
    const s = attribute ? obj.attributes?.[attribute] : obj.state;
    const u = obj.attributes.unit_of_measurement;
    if (unitOverride) {
      const num = parseFloat(s);
      if (Number.isFinite(num)) {
        return `${num.toFixed(decimals)} ${unitOverride}`;
      }
      return `${s} ${unitOverride}`;
    }
    if (s === "unknown" || s === "unavailable") return s;
    const num = parseFloat(s);
    const uLower = typeof u === "string" ? u.toLowerCase() : "";
    // Auto convert kWh → MWh when large
    if (Number.isFinite(num) && uLower === "kwh" && Math.abs(num) >= 1000) {
      const mwh = num / 1000;
      return `${mwh.toFixed(decimals)} MWh`;
    }
    if (this._isWattToKw(num, u)) return this._formatPower(num, u, decimals);
    if (Number.isFinite(num)) {
      if (u) return `${num.toFixed(decimals)} ${u}`;
      return num.toFixed(decimals);
    }
    return u ? `${s} ${u}` : s;
  }

  _isWattToKw(num, unit) {
    return unit && unit.toLowerCase() === "w" && Number.isFinite(num) && Math.abs(num) >= 1000;
  }

  _formatPower(num, unit, decimals = 1, unitOverride = null) {
    const displayUnit = unitOverride || unit;
    if (unitOverride) {
      return `${num.toFixed(decimals)} ${displayUnit}`;
    }
    if (this._isWattToKw(num, unit)) {
      const kw = num / 1000;
      return `${kw.toFixed(decimals)} kW`;
    }
    if (displayUnit) return `${num.toFixed(decimals)} ${displayUnit}`;
    return String(num);
  }

  _getEntityIcon(entityId, fallback = "mdi:power-plug") {
    if (!entityId) return fallback;
    const st = this.hass?.states?.[entityId];
    return st?.attributes?.icon || fallback;
  }

  _getBatteryIcon(soc) {
    const pct = Math.max(0, Math.min(100, Number.isFinite(soc) ? soc : 0));
    if (pct >= 95) return "mdi:battery";
    if (pct >= 85) return "mdi:battery-90";
    if (pct >= 75) return "mdi:battery-80";
    if (pct >= 65) return "mdi:battery-70";
    if (pct >= 55) return "mdi:battery-60";
    if (pct >= 45) return "mdi:battery-50";
    if (pct >= 35) return "mdi:battery-40";
    if (pct >= 25) return "mdi:battery-30";
    if (pct >= 15) return "mdi:battery-20";
    if (pct >= 5) return "mdi:battery-10";
    return "mdi:battery-outline";
  }

  _parseThreshold(val) {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return Number.isFinite(n) ? n : null;
  }

  _parseDecimalPlaces(val) {
    const n = typeof val === "string" ? parseInt(val, 10) : val;
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }

  _getDecimalPlaces(cfg) {
    const parsed = this._parseDecimalPlaces(cfg?.decimal_places);
    return parsed == null ? 1 : parsed;
  }

  _getUnitOverride(cfg) {
    return cfg?.unit || cfg?.unit_of_measurement || null;
  }

  _opacityFor(value, threshold) {
    if (!Number.isFinite(value)) return 1;
    if (value === 0) return 0.25;
    if (threshold == null) return 1;
    return Math.abs(value) < threshold ? 0.25 : 1;
  }

  _getNumeric(entityId, attribute = null) {
    if (!this.hass || !entityId) return 0;
    const st = this.hass.states[entityId];
    if (!st) return 0;
    const raw = attribute ? st.attributes?.[attribute] : st.state;
    const v = parseFloat(raw);
    return Number.isNaN(v) ? 0 : v;
  }

  _setLineColor(lineId, color, active = false) {
    const el = this.shadowRoot?.getElementById(lineId);
    if (!el) return;
    el.style.stroke = color;
    el.style.strokeOpacity = active ? "1" : "0.15";
    el.style.filter = active ? `drop-shadow(0 0 6px ${color})` : "none";
  }

  _updateFlows() {
    if (!this._config || !this.hass || !this.shadowRoot) return;

    const pvCfg = this._getEntityConfig("pv");
    const gridCfg = this._getEntityConfig("grid");
    const homeCfg = this._getEntityConfig("home");
    const batteryCfg = this._getEntityConfig("battery");
    const hasBattery =
      this._config?.entities &&
      Object.prototype.hasOwnProperty.call(this._config.entities, "battery") &&
      Boolean(batteryCfg?.entity);
    const thresholdMode = String(this._config?.threshold_mode || "calculations").toLowerCase();
    const useThresholdForCalc = thresholdMode === "calculations";
    const invertGrid = Boolean(gridCfg?.invert_state_values);
    const invertBattery = Boolean(batteryCfg?.invert_state_values);
    const pvLabels = this._normalizeLabels(pvCfg?.labels);
    const gridLabels = this._normalizeLabels(gridCfg?.labels);
    const batteryLabels = this._normalizeLabels(batteryCfg?.labels);

    const applyThreshold = (value, threshold) => {
      if (threshold == null) return value;
      return Math.abs(value) < threshold ? 0 : value;
    };

    const pvThreshold = this._parseThreshold(pvCfg.threshold);
    const gridThreshold = this._parseThreshold(gridCfg.threshold);
    const batteryThreshold = this._parseThreshold(batteryCfg.threshold);

    const pvRaw = this._getNumeric(pvCfg.entity);
    const pvCalc = useThresholdForCalc ? applyThreshold(pvRaw, pvThreshold) : pvRaw;
    const pv = Math.max(pvCalc, 0);

    const gridRaw = this._getNumeric(gridCfg.entity);
    const batteryRaw = this._getNumeric(batteryCfg.entity);
    const gridBase = invertGrid ? -gridRaw : gridRaw;
    const batteryBase = invertBattery ? -batteryRaw : batteryRaw;

    const grid = useThresholdForCalc ? applyThreshold(gridBase, gridThreshold) : gridBase;
    const homeRaw = this._getNumeric(homeCfg.entity);
    const battery = useThresholdForCalc
      ? applyThreshold(batteryBase, batteryThreshold)
      : batteryBase;

    // Flows always respect thresholds for visibility/animation
    const pvFlow = Math.max(applyThreshold(pvRaw, pvThreshold), 0);
    const gridFlow = applyThreshold(gridBase, gridThreshold);
    const batteryFlow = applyThreshold(batteryBase, batteryThreshold);

    const { sources: normalizedSources, subtractFromHome } = this._getSourcesConfig();

    let auxUsage = 0;
    for (const src of normalizedSources) {
      const entity = src.entity || null;
      const val = this._getNumeric(entity, src.attribute || null);
      if (!Number.isFinite(val)) continue;
      const thr = this._parseThreshold(src.threshold);
      const valForCalc = useThresholdForCalc ? applyThreshold(val, thr) : val;
      if (valForCalc > 0) auxUsage += valForCalc;
    }

    const hasHomeEntity = Boolean(homeCfg?.entity);
    let homeEffective = 0;
    const baseHome = Number.isFinite(homeRaw) ? homeRaw : 0;
    if (hasHomeEntity) {
      const adjustedHome = subtractFromHome ? baseHome - auxUsage : baseHome;
      homeEffective = Math.max(adjustedHome, 0);
    } else {
      const homeReported = Math.max(subtractFromHome ? baseHome - auxUsage : baseHome, 0);
      const inferredBase = pv + battery - grid;
      const inferred = Math.max(subtractFromHome ? inferredBase - auxUsage : inferredBase, 0);
      homeEffective = Math.max(inferred, homeReported);
    }
    this._homeEffective = homeEffective;

    const pvColor = this._getColor("pv", pvCfg);
    const gridColor = this._getColor("grid", gridCfg);
    const homeColor = this._getColor("home", homeCfg);
    const batteryColor = this._getColor("battery", batteryCfg);

    const threshold = 1; // allow very small exports/flows to render
    const gridImportThreshold = 0.5; // allow small imports to still show flow to home
    const baseDuration = 1500;

    const parseLineGeom = (id, fallback, reverse = false) => {
      const el = this.shadowRoot?.getElementById(id);
      if (!el) return fallback;
      const x1 = Number(el.getAttribute("x1"));
      const y1 = Number(el.getAttribute("y1"));
      const x2 = Number(el.getAttribute("x2"));
      const y2 = Number(el.getAttribute("y2"));
      if ([x1, y1, x2, y2].every((v) => Number.isFinite(v))) {
        if (reverse) {
          return { mode: "line", x1: x2, y1: y2, x2: x1, y2: y1 };
        }
        return { mode: "line", x1, y1, x2, y2 };
      }
      return fallback;
    };

    const parsePathGeom = (id, fallback, reverse = false) => {
      const el = this.shadowRoot?.getElementById(id);
      if (!el || !el.getTotalLength) return fallback;
      return { mode: "path", pathId: id, fallback, reverse };
    };

    const allLines = [
      "line-pv-grid",
      "line-pv-home",
      "line-pv-battery",
      "line-grid-home",
      "line-home-battery",
      "arc-grid-battery",
    ];
    for (const id of allLines) {
      this._setLineColor(id, "#7a7a7a", false);
    }

    // Geometry updated for marker positions:
    // PV marker anchor around (300,75) – below icon/label
    // GRID marker anchor around (60,75) inset to allow label width near edge
    // HOME marker anchor around (300,150)
    // BATTERY marker anchor around (540,75) inset equally to allow label width
    const geom = {
      "pv-grid": { mode: "line", x1: 290, y1: 70, x2: 60, y2: 86 },
      "pv-home": { mode: "line", x1: 300, y1: 70, x2: 300, y2: 140 },
      "pv-battery": { mode: "line", x1: 310, y1: 70, x2: 540, y2: 86 },

      "grid-home": { mode: "path", pathId: "line-grid-home" },
      "battery-home": { mode: "line", x1: 540, y1: 106, x2: 320, y2: 160 },

      "grid-battery": { mode: "line", x1: 60, y1: 96, x2: 540, y2: 96 },
      "battery-grid": { mode: "line", x1: 540, y1: 96, x2: 60, y2: 96 },
    };

    // Let flow dots follow the current drawn geometry (lines/paths) when updated.
    geom["pv-grid"] = parsePathGeom(
      "line-pv-grid",
      parseLineGeom("line-pv-grid", geom["pv-grid"]),
      true
    );
    geom["pv-battery"] = parsePathGeom(
      "line-pv-battery",
      parseLineGeom("line-pv-battery", geom["pv-battery"])
    );
    geom["pv-home"] = parseLineGeom("line-pv-home", geom["pv-home"]);
    geom["grid-battery"] = parsePathGeom(
      "arc-grid-battery",
      parseLineGeom("arc-grid-battery", geom["grid-battery"])
    );
    geom["battery-grid"] = parsePathGeom(
      "arc-grid-battery",
      parseLineGeom("arc-grid-battery", geom["battery-grid"]),
      true
    );
    geom["grid-home"] = parsePathGeom("line-grid-home", geom["grid-home"]);
    geom["battery-home"] = parsePathGeom("line-home-battery", geom["battery-home"], true);

    const lineIdMap = {
      "pv-grid": "line-pv-grid",
      "pv-home": "line-pv-home",
      "pv-battery": "line-pv-battery",
      "grid-home": "line-grid-home",
      "battery-home": "line-home-battery",
      "grid-battery": "arc-grid-battery",
      "battery-grid": "arc-grid-battery",
    };

    const active = {};

    // PV → (home → battery → grid)
    let pvToHome = 0;
    let pvToBattery = 0;
    let pvToGrid = 0;

    if (pvFlow > threshold) {
      const gridExport = gridFlow > 0 ? gridFlow : 0;
      const batteryCharge = batteryFlow < 0 ? -batteryFlow : 0;

      let remaining = pvFlow;

      pvToHome = Math.min(remaining, homeEffective);
      remaining -= pvToHome;

      pvToBattery = Math.min(remaining, batteryCharge);
      remaining -= pvToBattery;

      pvToGrid = Math.min(remaining, gridExport);
      remaining -= pvToGrid;

      if (pvToHome > threshold)
        active["pv-home"] = { geom: geom["pv-home"], magnitude: pvToHome, color: pvColor };
      if (pvToBattery > threshold)
        active["pv-battery"] = { geom: geom["pv-battery"], magnitude: pvToBattery, color: pvColor };
      if (pvToGrid > threshold)
        active["pv-grid"] = { geom: geom["pv-grid"], magnitude: pvToGrid, color: pvColor };
    }

    // Grid import (negative) – allocate only what PV/battery discharge didn't cover
    const gridImport = gridFlow < 0 ? -gridFlow : 0;
    const battDischarge = batteryFlow > 0 ? batteryFlow : 0;
    const batteryCharge = batteryFlow < 0 ? -batteryFlow : 0;

    const batteryToHome = Math.min(battDischarge, Math.max(homeEffective - pvToHome, 0));
    const battDischargeAfterHome = Math.max(battDischarge - batteryToHome, 0);
    const remainingHomeNeed = Math.max(homeEffective - pvToHome - batteryToHome, 0);
    let gridHomeMagnitude = Math.min(gridImport, remainingHomeNeed);
    let gridImportAfterHome = Math.max(gridImport - gridHomeMagnitude, 0);
    const remainingBatteryCharge = Math.max(batteryCharge - pvToBattery, 0);
    let gridBatteryMagnitude = Math.min(gridImportAfterHome, remainingBatteryCharge);

    // Fallback: if grid import exists but allocations are zero (rounding / mismatched sensors),
    // send import somewhere sensible so flows still render.
    if (gridImport > gridImportThreshold && gridHomeMagnitude === 0 && gridBatteryMagnitude === 0) {
      if (remainingBatteryCharge > 0) {
        gridBatteryMagnitude = Math.min(gridImport, remainingBatteryCharge || gridImport);
        gridImportAfterHome = Math.max(gridImport - gridBatteryMagnitude, 0);
      } else {
        gridHomeMagnitude = gridImport;
        gridImportAfterHome = 0;
      }
    }

    if (gridHomeMagnitude > gridImportThreshold)
      active["grid-home"] = {
        geom: geom["grid-home"],
        magnitude: gridHomeMagnitude,
        color: gridColor,
      };

    if (gridBatteryMagnitude > gridImportThreshold)
      active["grid-battery"] = {
        geom: geom["grid-battery"],
        magnitude: gridBatteryMagnitude,
        color: gridColor,
      };

    // Battery discharge
    const gridExport = gridFlow > 0 ? gridFlow : 0;

    if (batteryToHome > threshold)
      active["battery-home"] = {
        geom: geom["battery-home"],
        magnitude: batteryToHome,
        color: batteryColor,
      };

    const gridExportRemaining = Math.max(gridExport - pvToGrid, 0);
    if (battDischargeAfterHome > threshold && gridExportRemaining > threshold) {
      const batteryToGrid = Math.min(battDischargeAfterHome, gridExportRemaining);
      active["battery-grid"] = {
        geom: geom["battery-grid"],
        magnitude: batteryToGrid,
        color: batteryColor,
      };
    }

    let maxFlow = 0;
    for (const f of Object.values(active)) {
      if (f.magnitude > maxFlow) maxFlow = f.magnitude;
    }
    if (maxFlow <= 0) maxFlow = 0;

    const allNames = [
      "pv-home",
      "pv-battery",
      "pv-grid",
      "grid-home",
      "grid-battery",
      "battery-home",
      "battery-grid",
    ];

    for (const name of allNames) {
      const meta = active[name];
      if (meta && maxFlow > 0) {
        const id = lineIdMap[name];
        if (id) this._setLineColor(id, meta.color, true);

        const rawRatio = maxFlow / meta.magnitude;
        const factor = Math.min(Math.max(rawRatio, 1), 4);
        const duration = baseDuration * factor;

        this._startFlow(name, meta.geom, duration);
      } else {
        this._stopFlow(name);
      }
    }
  }

  _startFlow(name, geom, duration) {
    if (!this._flowAnimations) this._flowAnimations = {};

    const existing = this._flowAnimations[name];
    if (existing && existing.active) {
      existing.geom = geom;
      existing.duration = duration;
      return;
    }

    const dot = this.shadowRoot.getElementById(`dot-${name}`);
    if (!dot) return;
    dot.setAttribute("opacity", "1");

    const animState = {
      active: true,
      frameId: null,
      start: null,
      geom,
      duration,
    };

    const step = (timestamp) => {
      if (!animState.active) return;
      if (animState.start === null) animState.start = timestamp;

      const d = animState.duration || 1500;
      const elapsed = (timestamp - animState.start) % d;
      const t = elapsed / d;
      const fadeInEnd = 0.05;
      const fadeOutStart = 0.85;
      let opacity = 1;
      if (t <= fadeInEnd) {
        opacity = Math.min(1, t / fadeInEnd);
      } else if (t >= fadeOutStart) {
        opacity = Math.max(0, 1 - (t - fadeOutStart) / (1 - fadeOutStart));
      }

      let cx, cy;

      if (animState.geom.mode === "quad") {
        const { x0, y0, cx: qx, cy: qy, x1, y1 } = animState.geom;
        const inv = 1 - t;
        cx = inv * inv * x0 + 2 * inv * t * qx + t * t * x1;
        cy = inv * inv * y0 + 2 * inv * t * qy + t * t * y1;
      } else if (animState.geom.mode === "path") {
        if (!animState.pathEl) {
          animState.pathEl = this.shadowRoot?.getElementById(animState.geom.pathId);
          animState.pathLength = animState.pathEl?.getTotalLength?.() || 0;
        }
        if (animState.pathEl && animState.pathLength > 0) {
          const pos = animState.geom.reverse ? 1 - t : t;
          const pt = animState.pathEl.getPointAtLength(animState.pathLength * pos);
          cx = pt.x;
          cy = pt.y;
        } else {
          const { x1, y1, x2, y2 } = animState.geom.fallback || animState.geom;
          const pos = animState.geom.reverse ? 1 - t : t;
          cx = x1 + (x2 - x1) * pos;
          cy = y1 + (y2 - y1) * pos;
        }
      } else {
        const { x1, y1, x2, y2, reverse } = animState.geom;
        const pos = reverse ? 1 - t : t;
        cx = x1 + (x2 - x1) * pos;
        cy = y1 + (y2 - y1) * pos;
      }

      dot.setAttribute("cx", String(cx));
      dot.setAttribute("cy", String(cy));
      dot.setAttribute("opacity", opacity.toFixed(2));

      animState.frameId = requestAnimationFrame(step);
    };

    animState.frameId = requestAnimationFrame(step);
    this._flowAnimations[name] = animState;
  }

  _stopFlow(name) {
    if (!this._flowAnimations || !this._flowAnimations[name]) return;
    const state = this._flowAnimations[name];
    state.active = false;
    if (state.frameId) cancelAnimationFrame(state.frameId);

    const dot = this.shadowRoot.getElementById(`dot-${name}`);
    if (dot) dot.setAttribute("opacity", "0");

    delete this._flowAnimations[name];
  }

  _openMoreInfo(entityId) {
    if (!entityId || !this.hass) return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  render() {
    const html = this.html;

    const pvCfg = this._getEntityConfig("pv");
    const hasPv =
      this._config?.entities &&
      Object.prototype.hasOwnProperty.call(this._config.entities, "pv");
    const gridCfg = this._getEntityConfig("grid");
    const homeCfg = this._getEntityConfig("home");
    const batteryCfg = this._getEntityConfig("battery");
    const hasBattery =
      this._config?.entities &&
      Object.prototype.hasOwnProperty.call(this._config.entities, "battery") &&
      Boolean(batteryCfg?.entity);
    const invertGrid = Boolean(gridCfg?.invert_state_values);
    const invertBattery = Boolean(batteryCfg?.invert_state_values);
    const pvLabels = this._normalizeLabels(pvCfg?.labels);
    const gridLabels = this._normalizeLabels(gridCfg?.labels);
    const batteryLabels = this._normalizeLabels(batteryCfg?.labels);
    const { sources: normalizedSources } = this._getSourcesConfig();

    const pvDecimals = this._getDecimalPlaces(pvCfg);
    const gridDecimals = this._getDecimalPlaces(gridCfg);
    const batteryDecimals = this._getDecimalPlaces(batteryCfg);
    const homeDecimals = this._getDecimalPlaces(homeCfg);

    const pvUnitOverride = this._getUnitOverride(pvCfg);
    const gridUnitOverride = this._getUnitOverride(gridCfg);
    const batteryUnitOverride = this._getUnitOverride(batteryCfg);
    const homeUnitOverride = this._getUnitOverride(homeCfg);

    const pvVal = this._formatEntity(pvCfg.entity, pvDecimals, null, pvUnitOverride);
    const gridRawVal = this._formatEntity(gridCfg.entity, gridDecimals, null, gridUnitOverride);
    const battRawVal = this._formatEntity(batteryCfg.entity, batteryDecimals, null, batteryUnitOverride);

    const gridNumericRaw = this._getNumeric(gridCfg.entity);
    const gridNumeric = invertGrid ? -gridNumericRaw : gridNumericRaw;
    const gridUnit =
      gridUnitOverride ||
      this.hass?.states?.[gridCfg.entity]?.attributes?.unit_of_measurement ||
      "";
    const battNumericRaw = this._getNumeric(batteryCfg.entity);
    const battNumeric = invertBattery ? -battNumericRaw : battNumericRaw;
    const battUnit =
      batteryUnitOverride ||
      this.hass?.states?.[batteryCfg.entity]?.attributes?.unit_of_measurement ||
      "";
    const battSocEntity = null;
    const battSocLabel = null;
    const pvNumeric = this._getNumeric(pvCfg.entity);
    const homeNumeric = this._getNumeric(homeCfg.entity);
    const renderValue = (text) => {
      if (!text) return text;
      const m = /^([+-]?\d[\d.,]*)(.*)$/.exec(text);
      if (!m) return text;
      const num = m[1];
      const rest = m[2] || "";
      return html`<span class="value-number">${num}</span>${rest
        ? html`<span class="value-unit">${rest}</span>`
        : ""}`;
    };
    let gridVal = gridRawVal;
    let gridArrow = null;
    if (
      gridRawVal &&
      gridRawVal !== "unknown" &&
      gridRawVal !== "unavailable" &&
      Number.isFinite(gridNumeric)
    ) {
      const mag = Math.abs(gridNumeric);
      gridVal = this._formatPower(mag, gridUnit, gridDecimals, gridUnitOverride);
      gridArrow =
        gridNumeric > 0 ? "mdi:arrow-left-bold" : gridNumeric < 0 ? "mdi:arrow-right-bold" : null;
    }

    let battVal = battRawVal;
    let battArrow = null;
    if (
      battRawVal &&
      battRawVal !== "unknown" &&
      battRawVal !== "unavailable" &&
      Number.isFinite(battNumeric)
    ) {
      const mag = Math.abs(battNumeric);
      battVal = this._formatPower(mag, battUnit, batteryDecimals, batteryUnitOverride);
      battArrow =
        battNumeric > 0 ? "mdi:arrow-left-bold" : battNumeric < 0 ? "mdi:arrow-right-bold" : null;
    }

    const homeUnit =
      homeUnitOverride ||
      this.hass?.states?.[homeCfg.entity]?.attributes?.unit_of_measurement ||
      "W";
    const forceRawHome =
      homeCfg.force_raw_state ||
      homeCfg.force_raw ||
      homeCfg.raw_state ||
      this._config?.home_force_raw;
    const homeEffectiveRender = this._homeEffective || 0;
    let homeVal = this._formatEntity(homeCfg.entity, homeDecimals, null, homeUnitOverride);
    if (!forceRawHome && this._homeEffective != null) {
      const effective = this._homeEffective;
      if (this._isWattToKw(effective, homeUnit)) {
        homeVal = this._formatPower(effective, homeUnit, homeDecimals, homeUnitOverride);
      } else {
        homeVal = `${effective.toFixed(homeDecimals)} ${homeUnit}`;
      }
    }

    const pvColor = this._getColor("pv", pvCfg);
    const gridColor = this._getColor("grid", gridCfg);
    const homeColor = this._getColor("home", homeCfg);
    const batteryColor = this._getColor("battery", batteryCfg);

    const pvOpacity = this._opacityFor(pvNumeric, this._parseThreshold(pvCfg.threshold));
    const gridOpacity = this._opacityFor(gridNumeric, this._parseThreshold(gridCfg.threshold));
    const homeValueForOpacity = homeCfg?.entity ? homeNumeric : homeEffectiveRender;
    const homeOpacity = this._opacityFor(homeValueForOpacity, this._parseThreshold(homeCfg.threshold));
    const batteryOpacity = this._opacityFor(battNumeric, this._parseThreshold(batteryCfg.threshold));
    const batteryLabelOpacity =
      battNumeric === 0 && battRawVal && battRawVal !== "unknown" && battRawVal !== "unavailable"
        ? this._opacityFor(0, this._parseThreshold(batteryCfg.threshold))
        : batteryOpacity;

    const battSoc = null;
    const batteryIcon = "mdi:battery";

    const batteryIconOpacity = battNumeric === 0 ? 1 : batteryOpacity;
    const sourcePositions = [];
    const homeX = 300;
    const homeRowY = 190; // align with home marker vertically (aux row)
    const leftSlots = [homeX - 70, homeX - 130, homeX - 190, homeX - 250];
    const rightSlots = [homeX + 70, homeX + 130, homeX + 190, homeX + 250];
    for (let i = 0; i < normalizedSources.length && i < 8; i++) {
      const isLeft = i % 2 === 0;
      const idx = Math.floor(i / 2);
      const x = isLeft ? leftSlots[idx] : rightSlots[idx];
      sourcePositions.push({ x, y: homeRowY });
    }

    const sources = normalizedSources.map((src, idx) => {
      const entity = src.entity || null;
      const attribute = src.attribute || null;
      const icon = src.icon || this._getEntityIcon(entity, "mdi:power-plug");
      const numeric = this._getNumeric(entity, attribute);
      const unit =
        this._getUnitOverride(src) ||
        this.hass?.states?.[entity]?.attributes?.unit_of_measurement ||
        "";
      const decimals = this._getDecimalPlaces(src);
      let val = this._formatEntity(entity, decimals, attribute, this._getUnitOverride(src));
      if (Number.isFinite(numeric)) {
        const unitOverride = this._getUnitOverride(src);
        if (unitOverride) {
          val = `${Number(numeric).toFixed(decimals)} ${unitOverride}`;
        } else if (this._isWattToKw(numeric, unit)) {
          val = `${(numeric / 1000).toFixed(decimals)} kW`;
        } else if (unit) {
          val = `${Number(numeric).toFixed(decimals)} ${unit}`;
        } else {
          val = `${Number(numeric).toFixed(decimals)}`;
        }
      }
      const color = src.color || homeColor;
      const pos = sourcePositions[idx] || { x: homeX, y: homeRowY };
      const threshold = this._parseThreshold(src.threshold);
      const opacity = this._opacityFor(numeric, threshold);
      const leftPct = (pos.x / 600) * 100;
      const topPct = (pos.y / 240) * 100;
      return { entity, icon, val, color, pos, opacity, leftPct, topPct, numeric };
    });

    // Sync host classes for hiding sections
    this.classList.toggle("no-pv", !hasPv);
    this.classList.toggle("no-battery", !hasBattery);

    const pvLabelPositions = [
      { x: 260, anchor: "anchor-right" },
      { x: 340, anchor: "anchor-left" },
    ];
    const pvLabelY = 36;
    const pvLabelItems = pvLabels.map((lbl, idx) => {
      const entity = lbl.entity || null;
      const attribute = lbl.attribute || null;
      const unitOverride = this._getUnitOverride(lbl);
      const icon = lbl.icon || this._getEntityIcon(entity, "mdi:tag-text-outline");
      const color = lbl.color || pvColor;
      const numeric = this._getNumeric(entity, attribute);
      const decimals = this._getDecimalPlaces(lbl);
      const val = this._formatEntity(entity, decimals, attribute, unitOverride);
      const threshold = this._parseThreshold(lbl.threshold);
      const opacity = numeric === 0 ? 1 : this._opacityFor(numeric, threshold);
      const posMeta = pvLabelPositions[idx] || pvLabelPositions[pvLabelPositions.length - 1];
      const leftPct = (posMeta.x / 600) * 100;
      const topPct = (pvLabelY / 240) * 100;
      return {
        entity,
        icon,
        color,
        val,
        opacity,
        leftPct,
        topPct,
        anchor: posMeta.anchor,
        numeric,
      };
    });

    const gridLabelPositions = [
      { xPct: (32 / 600) * 100, yPct: (60 / 240) * 100 },
      { xPct: (32 / 600) * 100, yPct: (36 / 240) * 100 },
    ];
    const gridLabelItems = gridLabels.map((lbl, idx) => {
      const entity = lbl.entity || null;
      const attribute = lbl.attribute || null;
      const unitOverride = this._getUnitOverride(lbl);
      const icon = lbl.icon || this._getEntityIcon(entity, "mdi:tag-text-outline");
      const color = lbl.color || gridColor;
      const numeric = this._getNumeric(entity, attribute);
      const decimals = this._getDecimalPlaces(lbl);
      const val = this._formatEntity(entity, decimals, attribute, unitOverride);
      const threshold = this._parseThreshold(lbl.threshold);
      const opacity = numeric === 0 ? 1 : this._opacityFor(numeric, threshold);
      const pos = gridLabelPositions[idx] || gridLabelPositions[gridLabelPositions.length - 1];
      return {
        entity,
        icon,
        color,
        val,
        opacity,
        xPct: pos.xPct,
        yPct: pos.yPct,
        numeric,
      };
    });

    const batteryLabelPositions = [
      { xPct: (566 / 600) * 100, yPct: (60 / 240) * 100 },
      { xPct: (566 / 600) * 100, yPct: (36 / 240) * 100 },
    ];
    const batteryLabelItems = batteryLabels.map((lbl, idx) => {
      const entity = lbl.entity || null;
      const attribute = lbl.attribute || null;
      const unitOverride = this._getUnitOverride(lbl);
      const icon = lbl.icon || this._getEntityIcon(entity, "mdi:tag-text-outline");
      const color = lbl.color || batteryColor;
      const numeric = this._getNumeric(entity, attribute);
      const decimals = this._getDecimalPlaces(lbl);
      const val = this._formatEntity(entity, decimals, attribute, unitOverride);
      const threshold = this._parseThreshold(lbl.threshold);
      const opacity = this._opacityFor(numeric, threshold);
      const pos = batteryLabelPositions[idx] || batteryLabelPositions[batteryLabelPositions.length - 1];
      return {
        entity,
        icon,
        color,
        val,
        opacity,
        xPct: pos.xPct,
        yPct: pos.yPct,
        numeric,
      };
    });


    return html`
      <ha-card class="${[
        hasPv ? "" : "no-pv",
        hasBattery ? "" : "no-battery",
      ]
        .filter(Boolean)
        .join(" ")}">
        <div class="canvas">
          <svg viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet">

          <!-- Flow lines, updated endpoints -->
          <path id="line-pv-grid" class="flow-line"
                d="M60 86 H270 Q290 86 290 70" fill="none" />
          <line id="line-pv-home" class="flow-line"
                x1="300" y1="70" x2="300" y2="140" />
          <path id="line-pv-battery" class="flow-line"
                d="M310 70 Q310 86 330 86 H540" fill="none" />
          <path id="line-grid-home" class="flow-line"
                d="M60 106 H260 Q280 106 280 126 V160" fill="none" />
          <path id="line-home-battery" class="flow-line"
                d="M320 160 V126 Q320 106 340 106 H540" fill="none" />

          <circle id="dot-pv-home"      r="5" fill="${pvColor}" opacity="0" />
          <path id="arc-grid-battery" class="flow-line"
                d="M60 96 H285 Q300 76 315 96 H540"
                fill="none" />

          <!-- Remaining flow dots -->
          <circle id="dot-pv-grid"      r="5" fill="${pvColor}" opacity="0" />
          <circle id="dot-pv-battery"   r="5" fill="${pvColor}" opacity="0" />
          <circle id="dot-grid-home"    r="5" fill="${gridColor}" opacity="0" />
          <circle id="dot-grid-battery" r="5" fill="${gridColor}" opacity="0" />
          <circle id="dot-battery-home" r="5" fill="${batteryColor}" opacity="0" />
          <circle id="dot-battery-grid" r="5" fill="${batteryColor}" opacity="0" />

          </svg>
          <div class="overlay">
            <!-- grid voltage label removed -->
            ${pvLabelItems.map(
              (lbl) => html`<div class="overlay-item ${lbl.anchor}" style="left:${lbl.leftPct}%; top:${lbl.topPct}%;">
                <div class="aux-marker clickable" @click=${() => this._openMoreInfo(lbl.entity || null)}>
                  <ha-icon icon="${lbl.icon}" style="gap: 0px; color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: 18px; filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                  <div class="aux-label" style="margin-top: -6px; padding-bottom: 0px; color:${lbl.color}; opacity:${lbl.opacity};">${renderValue(lbl.val)}</div>
                </div>
              </div>`
            )}
            ${gridLabelItems.map(
              (lbl) => html`<div class="overlay-item anchor-left" style="left:${lbl.xPct}%; top:${lbl.yPct}%;">
                <div class="aux-marker clickable" style="flex-direction: row; gap: 4px;" @click=${() => this._openMoreInfo(lbl.entity || null)}>
                  <ha-icon icon="${lbl.icon}" style="color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: 16px; filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                  <div class="aux-label" style="color:${lbl.color}; opacity:${lbl.opacity};">${renderValue(lbl.val)}</div>
                </div>
              </div>`
            )}
            ${hasBattery
              ? batteryLabelItems.map(
                  (lbl) => html`<div class="overlay-item anchor-right battery-label" style="left:${lbl.xPct}%; top:${lbl.yPct}%;">
                    <div class="aux-marker clickable" style="flex-direction: row; gap: 4px;" @click=${() => this._openMoreInfo(lbl.entity || null)}>
                      <div class="aux-label" style="color:${lbl.color}; opacity:${lbl.opacity};">${renderValue(lbl.val)}</div>
                      <ha-icon icon="${lbl.icon}" style="color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: 16px; filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                    </div>
                  </div>`
                )
              : ""}
            <div class="overlay-item pv-section" style="left:${(300/600)*100}%; top:${(36/240)*100}%;">
              <div class="node-marker pv-marker clickable" @click=${() => this._openMoreInfo(pvCfg.entity)}>
                <div class="node-label" style="color:${pvColor}; opacity:${pvOpacity};">${renderValue(pvVal)}</div>
                <ha-icon icon="mdi:solar-panel" style="color:${pvColor}; opacity:${pvOpacity}; filter:${!this._isLightTheme() && pvNumeric !== 0 ? `drop-shadow(0 0 10px ${pvColor})` : "none"};"></ha-icon>
              </div>
            </div>
            <div class="overlay-item anchor-left" style="left:${(26/600)*100}%; top:${(108/240)*100}%;">
              <div class="node-marker grid-marker left clickable" @click=${() => this._openMoreInfo(gridCfg.entity)}>
                <ha-icon icon="mdi:transmission-tower" style="color:${gridColor}; opacity:${gridOpacity}; filter:${!this._isLightTheme() && gridNumeric !== 0 ? `drop-shadow(0 0 10px ${gridColor})` : "none"};"></ha-icon>
                <div class="node-label left" style="color:${gridColor};">
                  ${gridArrow
                    ? html`<ha-icon class="inline-icon" icon="${gridArrow}" style="color:${gridColor}; opacity:${gridOpacity};"></ha-icon>`
                    : ""}
                  <span style="opacity:${gridOpacity};">${renderValue(gridVal)}</span>
                </div>
              </div>
            </div>
            <div class="overlay-item" style="left:${(300/600)*100}%; top:${(176/240)*100}%;">
              <div class="home-marker clickable" @click=${() => this._openMoreInfo(homeCfg.entity)}>
                <ha-icon
                  icon="mdi:home"
                  style="color:${homeColor}; opacity:${homeOpacity};"
                ></ha-icon>
                <div class="home-label" style="color:${homeColor}; opacity:${homeOpacity};">${renderValue(homeVal)}</div>
              </div>
            </div>
            ${hasBattery
              ? html`<div class="overlay-item anchor-right battery-section" style="left:${(572/600)*100}%; top:${(108/240)*100}%;">
                  <div class="node-marker battery-marker right clickable" @click=${() => this._openMoreInfo(batteryCfg.entity)}>
                    <ha-icon icon="${batteryIcon}" style="color:${batteryColor}; opacity:${batteryIconOpacity}; filter:${!this._isLightTheme() && battNumeric !== 0 ? `drop-shadow(0 0 10px ${batteryColor})` : "none"};"></ha-icon>
                    <div class="node-label right" style="color:${batteryColor}; opacity:${batteryLabelOpacity};">
                      ${battArrow
                        ? html`<ha-icon class="inline-icon" icon="${battArrow}" style="color:${batteryColor}; opacity:1;"></ha-icon>`
                        : ""}
                      <span style="opacity:1;">${renderValue(battVal)}</span>
                    </div>
                  </div>
                </div>`
              : ""}

            ${sources.map(
              (src) => html`<div class="overlay-item" style="left:${src.leftPct}%; top:${src.topPct}%;">
                <div class="aux-marker clickable" @click=${() => this._openMoreInfo(src.entity || null)}>
                  <ha-icon icon="${src.icon}" style="color:${src.color}; opacity:${src.opacity}; filter:${!this._isLightTheme() && src.numeric !== 0 ? `drop-shadow(0 0 10px ${src.color})` : "none"};"></ha-icon>
                  <div class="aux-label" style="color:${src.color}; opacity:${src.opacity};">${renderValue(src.val)}</div>
                </div>
              </div>`
            )}
          </div>
        </div>
      </ha-card>
      </ha-card>
    `;
  }

  getCardSize() {
    return 2;
  }

  get html() {
    return (window.LitElement ||
      Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))).prototype.html;
  }

  static get css() {
    return (window.LitElement ||
      Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))).prototype.css;
  }
}

customElements.define("compact-power-card", CompactPowerCard);
