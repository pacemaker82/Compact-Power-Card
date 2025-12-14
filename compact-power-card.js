class CompactPowerCard extends (window.LitElement ||
  Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))) {

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  get html() {
    return (window.LitElement ||
      Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))).prototype.html;
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "help_text",
          type: "constant",
          value: "",
        },
      ],
      computeLabel: (schema) => {
        if (schema.name === "help_text") return "Settings Coming Soon";                
        return undefined;
      },
      computeHelper: (schema) => {
        switch (schema.name) {
          case "help_text":
            return "some helpful text";          
        }
        return undefined;
      },
    };
  }    

  getGridOptions() {
    return {
      rows: 3,
      columns: 12,
      min_rows: 3,
      min_columns: 9,
    };
  }

  static getStubConfig() {
    return {
      type: "custom:compact-power-card",
      entities: {
        pv: { entity: "sensor.givtcp_pv_power", decimal_places: 2 },
        grid: { entity: "sensor.givtcp_grid_power", decimal_places: 2 },
        battery: { entity: "sensor.givtcp_battery_power", decimal_places: 2 },
      },
    };
  }

  constructor() {
    super();
    this._hass = null;
    this._flowAnimations = {};
    this._homeEffective = null;
    this._homeEffectiveUnit = "W";
    this._resizeObserver = null;
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
    const css =
      (window.LitElement ||
        Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))).prototype.css;
    return css`
      :host {
        --cpc-scale: 1;
        display: block;
        height: 100%;
      }

      ha-card {
        box-sizing: border-box;
        padding: 0 4px 2px;
        background: var(--ha-card-background, var(--card-background-color));
        box-shadow: var(--ha-card-box-shadow);
        position: relative;
        height: 100%;
      }

      svg {
        width: 100%;
        height: 100%;
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
        vector-effect: non-scaling-stroke;
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
        font-size: calc(16px * var(--cpc-scale, 1));
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
        --mdc-icon-size: calc(28px * var(--cpc-scale, 1));
        filter: drop-shadow(0 0 0 rgba(0,0,0,0));
      }

      .node-label {
        font-size: calc(16px * var(--cpc-scale, 1));
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
        --mdc-icon-size: calc(12px * var(--cpc-scale, 1));
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
        --mdc-icon-size: calc(60px * var(--cpc-scale, 1));
        filter: none;
      }

      .home-label {
        font-size: calc(16px * var(--cpc-scale, 1));
        font-weight: 700;
        margin-top: -10px;
      }

      .battery-multi {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0px;
      }

      .battery-multi-item {
        display: flex;
        align-items: center;
        gap: 1px;
        font-size: calc(10px * var(--cpc-scale, 1));
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
        --mdc-icon-size: calc(24px * var(--cpc-scale, 1));
      }

      .aux-label {
        font-size: calc(12px * var(--cpc-scale, 1));
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
        height: 100%;
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

      /* Anchor top-right without vertical centering (useful for stacked lists) */
      .overlay-item.anchor-right-top {
        transform: translate(-100%, 0);
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

  connectedCallback() {
    super.connectedCallback();
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => this._updateScale());
    }
    this._resizeObserver.observe(this);
    this._updateScale();
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    super.disconnectedCallback();
  }

  _updateScale() {
    const rect = this.getBoundingClientRect ? this.getBoundingClientRect() : null;
    const hostWidth = rect?.width || 0;
    if (!hostWidth || hostWidth < 200) {
      this.style.setProperty("--cpc-scale", "1");
      return;
    }
    const baseWidth = 512; // match viewBox width
    const widthScale = hostWidth / baseWidth;
    const scale = Math.max(0.7, Math.min(1, widthScale));
    this.style.setProperty("--cpc-scale", scale.toFixed(3));
  }

  _adjustLayout() {
    const root = this.shadowRoot;
    if (!root) return;
    this._updateScale();
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
    if (Array.isArray(raw)) return raw.map((item) => this._normalizeEntityConfig(item));
    if (typeof raw === "object") {
      return { entity: raw.entity || null, color: raw.color, ...raw };
    }
    return { entity: null };
  }

  _normalizeEntityConfig(raw) {
    if (!raw) return { entity: null };
    if (typeof raw === "string") return { entity: raw };
    if (typeof raw === "object") return { entity: raw.entity || null, color: raw.color, ...raw };
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
      grid: "var(--energy-grid-consumption-color)",
      home: "var(--energy-battery-out-color)",
      battery: "var(--energy-battery-in-color)",
    };

    return (
      entityCfg?.color ||
      colors[kind] ||
      cfg[`${kind}_color`] ||
      defaults[kind]
    );
  }

  _getHeightFactor() {
    return 1;
  }

  _getEffectiveHeightFactor(batteryCount = 1) {
    return 1;
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

  _getPowerUnit() {
    const raw = String(this._config?.power_unit || "").trim().toLowerCase();
    if (["w", "kw", "mw"].includes(raw)) return raw;
    return null;
  }

  _formatPowerWithOverride(watts, decimals = 1, fallbackUnit = "W", unitOverride = null) {
    const cardUnit = this._getPowerUnit();
    if (cardUnit && Number.isFinite(watts)) {
      const factor = cardUnit === "kw" ? 1 / 1000 : cardUnit === "mw" ? 1000 : 1;
      const converted = watts * factor;
      const dec = cardUnit === "w" ? 0 : decimals;
      const label = cardUnit === "kw" ? "kW" : cardUnit === "mw" ? "mW" : "W";
      return `${converted.toFixed(dec)} ${label}`;
    }
    return this._formatPower(watts, fallbackUnit, decimals, unitOverride);
  }

  _formatPower(num, unit, decimals = 1, unitOverride = null) {
    const displayUnit = unitOverride || unit;
    const isWatts = String(displayUnit || "").toLowerCase() === "w";
    const dec = isWatts ? 0 : decimals;
    if (unitOverride) {
      return `${num.toFixed(dec)} ${displayUnit}`;
    }
    if (this._isWattToKw(num, unit)) {
      const kw = num / 1000;
      return `${kw.toFixed(decimals)} kW`;
    }
    if (displayUnit) return `${num.toFixed(dec)} ${displayUnit}`;
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

  _getLabelIcon(entityId, attribute = null, fallback = "mdi:tag-text-outline") {
    if (!entityId) return fallback;
    const st = this.hass?.states?.[entityId];
    const entityIcon = st?.attributes?.icon;
    const deviceClass = String(st?.attributes?.device_class || "").toLowerCase();
    if (entityIcon) return entityIcon;
    if (deviceClass === "battery") {
      const soc = this._getNumeric(entityId, attribute);
      return this._getBatteryIcon(soc);
    }
    return this._getEntityIcon(entityId, fallback);
  }

  _getBatterySocValue(cfg) {
    if (!cfg) return null;
    const entityOverride =
      cfg.battery_soc_entity || cfg.battery_soc_id || cfg.soc_entity || cfg.soc_entity_id;
    const attrOverride =
      cfg.battery_soc_attribute || cfg.battery_soc_attr || cfg.soc_attribute || cfg.soc_attr;
    let src = cfg.battery_soc || cfg.soc || cfg.soc_entity;
    if (!src && entityOverride) {
      src = { entity: entityOverride, attribute: attrOverride || null };
    }
    if (!src) return null;
    const resolve = (val) => {
      if (typeof val === "string") return { entity: val, attribute: null };
      if (typeof val === "object" && val) {
        const entity =
          val.entity ||
          val.entity_id ||
          val.id ||
          val.name ||
          val.source ||
          val.src ||
          val.soc;
        const attribute = val.attribute || val.attr || attrOverride || null;
        if (entity) return { entity, attribute };
      }
      return null;
    };
    const ref = resolve(src);
    if (!ref || !ref.entity) return null;
    const st = this.hass?.states?.[ref.entity];
    if (!st) return null;
    const raw = ref.attribute ? st.attributes?.[ref.attribute] : st.state;
    const num = parseFloat(raw);
    return Number.isFinite(num) ? num : null;
  }

  _toWatts(val, unit, allowNull = false) {
    const n = typeof val === "number" ? val : parseFloat(val);
    if (!Number.isFinite(n)) return allowNull ? null : 0;
    const u = String(unit || "").toLowerCase();
    if (u === "kw") return n * 1000;
    if (u === "mw") return n * 1000000;
    return n;
  }

  _fromWatts(val, unit) {
    const u = String(unit || "").toLowerCase();
    if (u === "kw") return val / 1000;
    if (u === "mw") return val / 1000000;
    return val;
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
    if (value === 0) return 0.4;
    if (threshold == null) return 1;
    return Math.abs(value) < threshold ? 0.4 : 1;
  }

  _isBelowThreshold(value, threshold) {
    if (!Number.isFinite(value)) return false;
    if (!Number.isFinite(threshold) || threshold <= 0) return false;
    return Math.abs(value) < threshold;
  }

  _getNumeric(entityId, attribute = null) {
    if (!this.hass || !entityId) return 0;
    const st = this.hass.states[entityId];
    if (!st) return 0;
    const raw = attribute ? st.attributes?.[attribute] : st.state;
    const v = parseFloat(raw);
    return Number.isNaN(v) ? 0 : v;
  }

  _getPowerMeta(entityId, unitOverride = null, attribute = null) {
    const value = this._getNumeric(entityId, attribute);
    const unit =
      unitOverride ||
      (entityId && this.hass?.states?.[entityId]?.attributes?.unit_of_measurement) ||
      "";
    return { value, unit, watts: this._toWatts(value, unit) };
  }

  _setLineColor(lineId, color, active = false) {
    const el = this.shadowRoot?.getElementById(lineId);
    if (!el) return;
    el.style.stroke = color;
    el.style.strokeOpacity = active ? "1" : "0.15";
    const allowGlow = !this._isLightTheme();
    el.style.filter = active && allowGlow ? `drop-shadow(0 0 6px ${color})` : "none";
  }

  _updateFlows() {
    if (!this._config || !this.hass || !this.shadowRoot) return;

    const pvCfg = this._getEntityConfig("pv");
    const gridCfg = this._getEntityConfig("grid");
    const homeCfg = this._getEntityConfig("home");
    const batteryRaw = this._getEntityConfig("battery");
    const batteryList = Array.isArray(batteryRaw)
      ? batteryRaw
      : batteryRaw
      ? [batteryRaw]
      : [{ entity: null }];
    const batteryCfg = batteryList[0] || { entity: null };
    const hasBattery =
      this._config?.entities &&
      Object.prototype.hasOwnProperty.call(this._config.entities, "battery") &&
      batteryList.some((b) => Boolean(b?.entity));
    const thresholdMode = String(this._config?.threshold_mode || "calculations").toLowerCase();
    const useThresholdForCalc = thresholdMode === "calculations";
    const invertGrid = Boolean(gridCfg?.invert_state_values);
    const invertBattery = Boolean(batteryCfg?.invert_state_values);
    const pvLabels = this._normalizeLabels(pvCfg?.labels);
    const gridLabels = this._normalizeLabels(gridCfg?.labels);
    const batteryLabelsSource = Array.isArray(this._config?.entities?.battery)
      ? this._config?.entities?.battery_labels || this._config?.entities?.battery?.labels
      : batteryCfg?.labels;
    const batteryLabels = this._normalizeLabels(batteryLabelsSource);
    const pvUnit =
      this._getUnitOverride(pvCfg) ||
      this.hass?.states?.[pvCfg.entity]?.attributes?.unit_of_measurement ||
      "";
    const gridUnit =
      this._getUnitOverride(gridCfg) ||
      this.hass?.states?.[gridCfg.entity]?.attributes?.unit_of_measurement ||
      "";
    const batteryUnit =
      this._getUnitOverride(batteryCfg) ||
      this.hass?.states?.[batteryCfg.entity]?.attributes?.unit_of_measurement ||
      "";
    const homeUnit =
      this._getUnitOverride(homeCfg) ||
      this.hass?.states?.[homeCfg.entity]?.attributes?.unit_of_measurement ||
      "";

    const applyThreshold = (value, threshold) => {
      if (threshold == null) return value;
      return Math.abs(value) < threshold ? 0 : value;
    };

    const pvThreshold = this._toWatts(this._parseThreshold(pvCfg.threshold), "W", true);
    const gridThreshold = this._toWatts(this._parseThreshold(gridCfg.threshold), "W", true);
    const batteryThreshold = null; // thresholds applied per battery above

    const pvMeta = this._getPowerMeta(pvCfg.entity, pvUnit);
    const gridMeta = this._getPowerMeta(gridCfg.entity, gridUnit);
    const batteryMetas = batteryList.map((b) => {
      const unit =
        this._getUnitOverride(b) ||
        (b.entity && this.hass?.states?.[b.entity]?.attributes?.unit_of_measurement) ||
        batteryUnit ||
        "";
      return this._getPowerMeta(b.entity, unit);
    });
    const homeMeta = this._getPowerMeta(homeCfg.entity, homeUnit);

    const pvRawW = pvMeta.watts;
    const pvCalcW = useThresholdForCalc ? applyThreshold(pvRawW, pvThreshold) : pvRawW;
    const pv = Math.max(pvCalcW, 0);

    const gridBaseW = invertGrid ? -gridMeta.watts : gridMeta.watts;
    const batteryItems = batteryMetas.map((meta, idx) => {
      const cfg = batteryList[idx] || {};
      const invert = Boolean(cfg?.invert_state_values || invertBattery);
      const thr = this._toWatts(this._parseThreshold(cfg.threshold), "W", true);
      const raw = invert ? -meta.watts : meta.watts;
      const effective = useThresholdForCalc ? applyThreshold(raw, thr) : raw;
      return { cfg, meta, raw, effective, threshold: thr, unit: meta.unit || batteryUnit };
    });

    const batteryBaseW = batteryItems.reduce((sum, item) => sum + item.effective, 0);

    const grid = useThresholdForCalc ? applyThreshold(gridBaseW, gridThreshold) : gridBaseW;
    const homeRawW = homeMeta.watts;
    const battery = batteryBaseW;

    // Flows always respect thresholds for visibility/animation
    const pvFlow = Math.max(applyThreshold(pvRawW, pvThreshold), 0);
    const gridFlow = applyThreshold(gridBaseW, gridThreshold);
    const batteryFlow = applyThreshold(batteryBaseW, batteryThreshold);

    const { sources: normalizedSources, subtractFromHome } = this._getSourcesConfig();

    let auxUsage = 0;
    for (const src of normalizedSources) {
      const entity = src.entity || null;
      const attribute = src.attribute || null;
      const srcUnit =
        this._getUnitOverride(src) ||
        this.hass?.states?.[entity]?.attributes?.unit_of_measurement ||
        "";
      const srcMeta = this._getPowerMeta(entity, srcUnit, attribute);
      if (!Number.isFinite(srcMeta.watts)) continue;
      const thr = this._toWatts(this._parseThreshold(src.threshold), "W", true);
      const valForCalc = useThresholdForCalc ? applyThreshold(srcMeta.watts, thr) : srcMeta.watts;
      if (valForCalc > 0) auxUsage += valForCalc;
    }

    const hasHomeEntity = Boolean(homeCfg?.entity);
    let homeEffective = 0;
    const baseHome = Number.isFinite(homeRawW) ? homeRawW : 0;
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
    this._homeEffectiveUnit = "W";

    const pvColor = this._getColor("pv", pvCfg);
    const gridColor = this._getColor("grid", gridCfg);
    const homeColor = this._getColor("home", homeCfg);
    const batteryColor = this._getColor("battery", batteryCfg);

    const threshold = 0;
    const gridImportThreshold = 0;
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
    const lineBaseColors = {
      "line-pv-grid": pvColor,
      "line-pv-home": pvColor,
      "line-pv-battery": pvColor,
      "line-grid-home": gridColor,
      "line-home-battery": batteryColor,
      "arc-grid-battery": gridColor,
    };
    for (const id of allLines) {
      const baseColor = lineBaseColors[id] || "#7a7a7a";
      this._setLineColor(id, baseColor, false);
    }

    // Geometry helpers consistent with render()
    const designWidth = 512;
    const designHeight = 184;
    const defaultWidth = 512;
    const defaultHeight = 184;
    const hostRect = this.getBoundingClientRect ? this.getBoundingClientRect() : null;
    const baseWidth = Math.max(200, hostRect?.width || defaultWidth);
    const baseHeight = Math.max(120, hostRect?.height || defaultHeight);
    const extraHeight = Math.max(0, baseHeight - designHeight);
    const anchorLeftX = 51.2;
    const anchorRightMargin = 51.2;
    const designUsableWidth = designWidth - anchorLeftX - anchorRightMargin;
    const usableWidth = Math.max(10, baseWidth - anchorLeftX - anchorRightMargin);
    const sx = (v) => anchorLeftX + ((v - anchorLeftX) / designUsableWidth) * usableWidth;
    const yOffset = 4;
    const sy = (v) => v + yOffset; // keep base coords stable in Y; extra height applied below
    const syHome = (v) => sy(v) + extraHeight;
    const syGridBatt = (v) => sy(v) + extraHeight * 0.5;
    const homeCenterX = baseWidth / 2;
    const homeLineOffset = 17;
    const gridHomeEndX = homeCenterX - homeLineOffset;
    const homeBatteryStartX = homeCenterX + homeLineOffset;
    const pvCenterX = homeCenterX;
    const pvLeftBendX = pvCenterX - 16; // 240 at default
    const pvLeftArcEndX = pvCenterX - 8.5; // 247.5 at default
    const pvRightArcStartX = pvCenterX + 8.5; // 264.5 at default
    const pvRightArcEndX = pvCenterX + 15; // 271 at default
    const homeAnchorX = homeCenterX;
    const homeAnchorY = syHome(135);
    const batteryAnchorX = sx(488);
    const batteryAnchorY = syGridBatt(86);
    const gridAnchorX = sx(anchorLeftX);
    const gridMidY = syGridBatt(81.3);
    const gridArcY = syGridBatt(73.6);

    // Geometry updated for marker positions:
    // PV marker anchor around (300,75) – below icon/label
    // GRID marker anchor around (60,75) inset to allow label width near edge
    // HOME marker anchor around (300,150)
    // BATTERY marker anchor around (540,75) inset equally to allow label width
    const geom = {
      "pv-grid": { mode: "line", x1: pvLeftArcEndX, y1: sy(52), x2: sx(51.2), y2: syGridBatt(65) },
      "pv-home": { mode: "line", x1: homeCenterX, y1: sy(52), x2: homeCenterX, y2: syHome(106) },
      "pv-battery": { mode: "line", x1: pvRightArcStartX, y1: sy(52), x2: sx(460.8), y2: syGridBatt(65) },

      "grid-home": { mode: "path", pathId: "line-grid-home" },
      "battery-home": { mode: "line", x1: sx(460.8), y1: syGridBatt(81.3), x2: homeBatteryStartX, y2: syHome(122.7) },

      "grid-battery": { mode: "line", x1: sx(51.2), y1: syGridBatt(73.6), x2: sx(460.8), y2: syGridBatt(73.6) },
      "battery-grid": { mode: "line", x1: sx(460.8), y1: syGridBatt(73.6), x2: sx(51.2), y2: syGridBatt(73.6) },
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

    // Flow priorities:
    // Grid (import): home → battery (charge)
    // PV: home → battery (charge) → export
    // Battery (discharge): home → export (only what PV/grid didn't cover)
    const gridImport = gridFlow < 0 ? -gridFlow : 0;
    const gridExport = gridFlow > 0 ? gridFlow : 0;
    const battDischarge = batteryFlow > 0 ? batteryFlow : 0;
    const battCharge = batteryFlow < 0 ? -batteryFlow : 0;

    let homeNeed = Math.max(homeEffective, 0);
    let chargeNeed = battCharge;

    // Grid import → home, then battery charge
    const gridToHome = Math.min(gridImport, homeNeed);
    homeNeed -= gridToHome;
    const gridImportRemaining = Math.max(gridImport - gridToHome, 0);
    const gridToBattery = Math.min(gridImportRemaining, chargeNeed);
    chargeNeed -= gridToBattery;

    // PV → remaining home, then remaining battery charge, then export
    const pvToHome = Math.min(pvFlow, homeNeed);
    homeNeed -= pvToHome;
    let pvRemaining = pvFlow - pvToHome;
    const pvToBattery = Math.min(pvRemaining, chargeNeed);
    pvRemaining -= pvToBattery;
    const pvToGrid = Math.min(pvRemaining, gridExport);

    // Battery discharge → remaining home, then export (only what PV export didn't cover)
    const batteryToHome = Math.min(battDischarge, homeNeed);
    homeNeed -= batteryToHome;
    const battDischargeAfterHome = Math.max(battDischarge - batteryToHome, 0);
    const batteryToGrid = Math.min(battDischargeAfterHome, Math.max(gridExport - pvToGrid, 0));

    if (pvToHome > threshold)
      active["pv-home"] = { geom: geom["pv-home"], magnitude: pvToHome, color: pvColor };
    if (pvToBattery > threshold)
      active["pv-battery"] = { geom: geom["pv-battery"], magnitude: pvToBattery, color: pvColor };
    if (pvToGrid > threshold)
      active["pv-grid"] = { geom: geom["pv-grid"], magnitude: pvToGrid, color: pvColor };

    if (gridToHome > gridImportThreshold)
      active["grid-home"] = {
        geom: geom["grid-home"],
        magnitude: gridToHome,
        color: gridColor,
      };
    if (gridToBattery > gridImportThreshold)
      active["grid-battery"] = {
        geom: geom["grid-battery"],
        magnitude: gridToBattery,
        color: gridColor,
      };

    if (batteryToHome > threshold)
      active["battery-home"] = {
        geom: geom["battery-home"],
        magnitude: batteryToHome,
        color: batteryColor,
      };
    if (batteryToGrid > threshold)
      active["battery-grid"] = {
        geom: geom["battery-grid"],
        magnitude: batteryToGrid,
        color: batteryColor,
      };

    // Fallback: if battery is discharging but no line was activated (PV/grid covered needs),
    // still show a battery → home flow so discharge is visible.
    if (
      battDischarge > threshold &&
      !active["battery-home"] &&
      !active["battery-grid"]
    ) {
      active["battery-home"] = {
        geom: geom["battery-home"],
        magnitude: battDischarge,
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
    const batteryRaw = this._getEntityConfig("battery");
    const batteryList = Array.isArray(batteryRaw)
      ? batteryRaw
      : batteryRaw
      ? [batteryRaw]
      : [{ entity: null }];
    const batteryCfg = batteryList[0] || { entity: null };
    const hasBattery =
      this._config?.entities &&
      Object.prototype.hasOwnProperty.call(this._config.entities, "battery") &&
      batteryList.some((b) => Boolean(b?.entity));
    const invertGrid = Boolean(gridCfg?.invert_state_values);
    const invertBattery = Boolean(batteryCfg?.invert_state_values);
    const pvLabels = this._normalizeLabels(pvCfg?.labels);
    const gridLabels = this._normalizeLabels(gridCfg?.labels);
    const batteryLabelsSource = Array.isArray(this._config?.entities?.battery)
      ? this._config?.entities?.battery_labels || this._config?.entities?.battery?.labels
      : batteryCfg?.labels;
    const batteryLabels = this._normalizeLabels(batteryLabelsSource);
    const { sources: normalizedSources } = this._getSourcesConfig();
    const designWidth = 512;
    const designHeight = 184;
    const defaultWidth = 512;
    const defaultHeight = 184;
    const hostRect = this.getBoundingClientRect ? this.getBoundingClientRect() : null;
    const baseWidth = Math.max(200, hostRect?.width || defaultWidth);
    const baseHeight = Math.max(120, hostRect?.height || defaultHeight);
    const extraHeight = Math.max(0, baseHeight - designHeight);
    const viewHeight = baseHeight;
    const anchorLeftX = 51.2;
    const anchorRightMargin = 51.2;
    const designUsableWidth = designWidth - anchorLeftX - anchorRightMargin;
    const usableWidth = Math.max(10, baseWidth - anchorLeftX - anchorRightMargin);
    const sx = (v) => anchorLeftX + ((v - anchorLeftX) / designUsableWidth) * usableWidth;
    const yOffset = 4;
    const sy = (v) => v + yOffset; // keep base coords stable in Y; we’ll add extra height only where needed
    const syHome = (v) => sy(v) + extraHeight; // home row grows downward with height
    const syGridBatt = (v) => sy(v) + extraHeight * 0.5; // mid rows grow halfway
    const homeCenterX = baseWidth / 2;
    const homeLineOffset = 17;
    const gridHomeEndX = homeCenterX - homeLineOffset;
    const homeBatteryStartX = homeCenterX + homeLineOffset;
    const gridHomeH1X = gridHomeEndX - homeLineOffset; // 17px inset before curve
    const homeBatteryCtrl2X = homeBatteryStartX + homeLineOffset; // second control 17px out
    const pvCenterX = homeCenterX;
    const pvLeftBendX = pvCenterX - 16; // 240 at default
    const pvLeftArcEndX = pvCenterX - 8.5; // 247.5 at default
    const pvRightArcStartX = pvCenterX + 8.5; // 264.5 at default
    const pvRightArcEndX = pvCenterX + 15; // 271 at default
    const gridLineStartX = sx(51.2);
    const gridLineEndX = sx(460.8);
    const gridArcMidX = (gridLineStartX + gridLineEndX) / 2;
    const gridArcHalfWidth = 12.8; // half of 25.6px
    const gridArcStartX = gridArcMidX - gridArcHalfWidth;
    const gridArcEndX = gridArcMidX + gridArcHalfWidth;
    const gridArcCtrlX = gridArcMidX;
    const gridArcY = syGridBatt(73.6);
    const gridArcCtrlY = gridArcY - 15.3; // hump rises 15.3px above midline
    const gridIconX = gridLineStartX - 26; // offset from line start
    const batteryIconX = gridLineEndX + 26; // offset from line end
    const pctBaseY = (v) => ((sy(v)) / viewHeight) * 100; // PV: stay near top as view grows
    const pctGridY = (v) => ((syGridBatt(v)) / viewHeight) * 100;
    const pctGridFixed = (v) => (sy(v) / viewHeight) * 100; // keep label anchors stable when height grows
    const pctHomeY = (v) => ((syHome(v)) / viewHeight) * 100;

    const pvDecimals = this._getDecimalPlaces(pvCfg);
    const gridDecimals = this._getDecimalPlaces(gridCfg);
    const batteryDecimals = this._getDecimalPlaces(batteryCfg);
    const homeDecimals = this._getDecimalPlaces(homeCfg);

    const pvUnitOverride = this._getUnitOverride(pvCfg);
    const gridUnitOverride = this._getUnitOverride(gridCfg);
    const batteryUnitOverride = this._getUnitOverride(batteryCfg);
    const homeUnitOverride = this._getUnitOverride(homeCfg);

    const pvUnitRaw =
      pvUnitOverride || this.hass?.states?.[pvCfg.entity]?.attributes?.unit_of_measurement || "";
    const gridUnitRaw =
      gridUnitOverride || this.hass?.states?.[gridCfg.entity]?.attributes?.unit_of_measurement || "";
    const batteryUnitRaw =
      batteryUnitOverride ||
      this.hass?.states?.[batteryCfg.entity]?.attributes?.unit_of_measurement ||
      "";

    // Numeric values in watts
    const pvNumeric = this._getNumeric(pvCfg.entity);
    const homeNumeric = this._getNumeric(homeCfg.entity);
    const pvNumericW = this._toWatts(pvNumeric, pvUnitRaw);
    const gridNumericRaw = this._getNumeric(gridCfg.entity);
    const gridNumeric = invertGrid ? -gridNumericRaw : gridNumericRaw;
    const gridNumericW = this._toWatts(gridNumeric, gridUnitRaw);

    const thresholdMode = String(this._config?.threshold_mode || "calculations").toLowerCase();
    const useThresholdForCalc = thresholdMode === "calculations";
    const applyThreshold = (value, threshold) => {
      if (threshold == null) return value;
      return Math.abs(value) < threshold ? 0 : value;
    };

    const pvDisplayUnit = "W";
    const pvState = this.hass?.states?.[pvCfg.entity]?.state;
    const pvVal = Number.isFinite(pvNumericW)
      ? this._formatPowerWithOverride(pvNumericW, pvDecimals, pvDisplayUnit, pvUnitOverride ?? null)
      : this._formatEntity(pvCfg.entity, pvDecimals, null, pvUnitOverride);
    const gridDisplayUnit = "W";
    const battUnit = "W";
    const battSocEntity = null;
    const battSocLabel = null;
    const batteryItems = batteryList.map((cfg) => {
      const unit =
        this._getUnitOverride(cfg) ||
        (cfg.entity && this.hass?.states?.[cfg.entity]?.attributes?.unit_of_measurement) ||
        battUnit;
      const raw = this._getNumeric(cfg.entity);
      const inverted = (cfg?.invert_state_values || invertBattery) ? -raw : raw;
      const rawW = this._toWatts(inverted, unit);
      const thr = this._toWatts(this._parseThreshold(cfg.threshold), "W", true);
      const effective = useThresholdForCalc ? applyThreshold(rawW, thr) : rawW;
      return { cfg, raw: rawW, effective, threshold: thr };
    });
    const battNumericW = batteryItems.reduce((sum, item) => sum + item.effective, 0);
    const pvThresholdDisplay = this._toWatts(this._parseThreshold(pvCfg.threshold), "W", true);
    const gridThresholdDisplay = this._toWatts(this._parseThreshold(gridCfg.threshold), "W", true);
    const batteryThresholdDisplay = this._toWatts(
      this._parseThreshold(batteryCfg.threshold),
      "W",
      true
    );
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
    const gridState = this.hass?.states?.[gridCfg.entity]?.state;
    let gridVal = Number.isFinite(gridNumericW)
      ? this._formatPowerWithOverride(Math.abs(gridNumericW), gridDecimals, gridDisplayUnit, gridUnitOverride ?? null)
      : gridState;
    let gridArrow = null;
    if (Number.isFinite(gridNumericW)) {
      gridArrow =
        gridNumericW > 0
          ? "mdi:arrow-left-bold"
          : gridNumericW < 0
          ? "mdi:arrow-right-bold"
          : null;
    }

    const battDisplay = battNumericW;
    const battVal = Number.isFinite(battDisplay)
      ? this._formatPowerWithOverride(Math.abs(battDisplay), batteryDecimals, battUnit, batteryUnitOverride ?? null)
      : this._formatEntity(batteryCfg.entity, batteryDecimals, null, batteryUnitOverride);
    const battArrow =
      battDisplay > 0 ? "mdi:arrow-left-bold" : battDisplay < 0 ? "mdi:arrow-right-bold" : null;

    const inferredHomeUnit =
      pvUnitRaw || gridUnitRaw || batteryUnitRaw || homeUnitOverride || "W";
    const homeUnit = "W";
    const homeNumericW = this._toWatts(homeNumeric, inferredHomeUnit);
    const homeEffectiveW = this._homeEffective || 0;
    const homeEffectiveRender = homeEffectiveW;
    const homeThresholdDisplay = this._toWatts(this._parseThreshold(homeCfg.threshold), "W", true);
    const forceRawHome =
      homeCfg.force_raw_state ||
      homeCfg.force_raw ||
      homeCfg.raw_state ||
      this._config?.home_force_raw;
    let homeVal = Number.isFinite(homeNumericW)
      ? this._formatPowerWithOverride(homeNumericW, homeDecimals, homeUnit, homeUnitOverride ?? null)
      : this._formatEntity(homeCfg.entity, homeDecimals, null, homeUnitOverride);
    if (!forceRawHome && this._homeEffective != null) {
      const effectiveDisplay = homeEffectiveW;
      homeVal = this._formatPowerWithOverride(effectiveDisplay, homeDecimals, homeUnit, homeUnitOverride ?? null);
    }

    const pvColor = this._getColor("pv", pvCfg);
    const gridColor = this._getColor("grid", gridCfg);
    const homeColor = this._getColor("home", homeCfg);
    const batteryColor = this._getColor("battery", batteryCfg);

    const pvOpacity = this._opacityFor(pvNumericW, pvThresholdDisplay);
    const gridOpacity = this._opacityFor(gridNumericW, gridThresholdDisplay);
    const homeValueForOpacity = homeCfg?.entity ? homeNumericW : homeEffectiveW;
    const homeOpacity = this._opacityFor(homeValueForOpacity, homeThresholdDisplay);
    const batteryOpacity = this._opacityFor(battNumericW, batteryThresholdDisplay);
    const batteryLabelOpacity = batteryOpacity;
    const pvLabelHidden = this._isBelowThreshold(pvNumericW, pvThresholdDisplay);
    const gridLabelHidden = this._isBelowThreshold(gridNumericW, gridThresholdDisplay);
    const homeLabelHidden = this._isBelowThreshold(homeValueForOpacity, homeThresholdDisplay);
    const batteryLabelHidden = this._isBelowThreshold(battNumericW, batteryThresholdDisplay);

    const batterySocPrimary = this._getBatterySocValue(batteryCfg);
    const batteryIcon = Number.isFinite(batterySocPrimary)
      ? this._getBatteryIcon(batterySocPrimary)
      : battDisplay < 0
      ? "mdi:battery-charging"
      : "mdi:battery";

    const batteryIconOpacity = 1;
    const sourcePositions = [];
    const homeX = homeCenterX;
    const homeRowYBase = 145; // base Y for aux row; actual Y will be adjusted via pctHomeY
    const slotSpacing = [60, 120, 180, 240]; // fixed design spacing (do not scale with width)
    const leftSlots = slotSpacing.map((d) => homeX - d);
    const rightSlots = slotSpacing.map((d) => homeX + d);
    for (let i = 0; i < normalizedSources.length && i < 8; i++) {
      const isLeft = i % 2 === 0;
      const idx = Math.floor(i / 2);
      const x = isLeft ? leftSlots[idx] : rightSlots[idx];
      sourcePositions.push({ x, y: homeRowYBase });
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
      const numericW = this._toWatts(numeric, unit);
      const unitOverride = this._getUnitOverride(src);
      let val = Number.isFinite(numericW)
        ? this._formatPowerWithOverride(numericW, decimals, "W", unitOverride ?? null)
        : this._formatEntity(entity, decimals, attribute, unitOverride);
      const color = src.color || homeColor;
      const pos = sourcePositions[idx] || { x: homeX, y: homeRowYBase };
      const threshold = this._toWatts(this._parseThreshold(src.threshold), "W", true);
      const opacity = this._opacityFor(numericW, threshold);
      const hidden = this._isBelowThreshold(numericW, threshold);
      const leftPct = (pos.x / baseWidth) * 100;
      const topPctVal = pctHomeY(pos.y);
      return {
        entity,
        icon,
        val,
        color,
        pos,
        opacity,
        hidden,
        leftPct,
        topPct: topPctVal,
        numeric: numericW,
      };
    });

    // Sync host classes for hiding sections
    this.classList.toggle("no-pv", !hasPv);
    this.classList.toggle("no-battery", !hasBattery);

    const pvLabelPositions = [
      { x: sx(222), anchor: "anchor-right" },
      { x: sx(290), anchor: "anchor-left" },
    ];
    const pvLabelY = 28;
    const pvLabelItems = pvLabels.map((lbl, idx) => {
      const entity = lbl.entity || null;
      const attribute = lbl.attribute || null;
      const unitOverride = this._getUnitOverride(lbl);
      const icon = lbl.icon || this._getLabelIcon(entity, attribute, "mdi:tag-text-outline");
      const color = lbl.color || pvColor;
      const numeric = this._getNumeric(entity, attribute);
      const decimals = this._getDecimalPlaces(lbl);
      const val = this._formatEntity(entity, decimals, attribute, unitOverride);
      const labelUnit =
        unitOverride ||
        this.hass?.states?.[entity]?.attributes?.unit_of_measurement ||
        "";
      const numericW = this._toWatts(numeric, labelUnit);
      const threshold = this._toWatts(this._parseThreshold(lbl.threshold), "W", true);
      const opacity = numericW === 0 ? 1 : this._opacityFor(numericW, threshold);
      const hidden = this._isBelowThreshold(numericW, threshold);
      const posMeta = pvLabelPositions[idx] || pvLabelPositions[pvLabelPositions.length - 1];
      const leftPct = (posMeta.x / baseWidth) * 100;
      const yPct = pctBaseY(pvLabelY); // PV stays fixed in Y
      return {
        entity,
        icon,
        color,
        val,
        opacity,
        hidden,
        leftPct,
        topPct: yPct,
        anchor: posMeta.anchor,
        numeric: numericW,
      };
    });

    const gridLabelPositions = [
      { xPct: ((gridIconX + 6) / baseWidth) * 100, yPct: pctGridY(46) },
      { xPct: ((gridIconX + 6) / baseWidth) * 100, yPct: pctGridY(28) },
    ];
    const gridLabelItems = gridLabels.map((lbl, idx) => {
      const entity = lbl.entity || null;
      const attribute = lbl.attribute || null;
      const unitOverride = this._getUnitOverride(lbl);
      const icon = lbl.icon || this._getLabelIcon(entity, attribute, "mdi:tag-text-outline");
      const color = lbl.color || gridColor;
      const numeric = this._getNumeric(entity, attribute);
      const decimals = this._getDecimalPlaces(lbl);
      const val = this._formatEntity(entity, decimals, attribute, unitOverride);
      const labelUnit =
        unitOverride ||
        this.hass?.states?.[entity]?.attributes?.unit_of_measurement ||
        "";
      const numericW = this._toWatts(numeric, labelUnit);
      const threshold = this._toWatts(this._parseThreshold(lbl.threshold), "W", true);
      const opacity = numericW === 0 ? 1 : this._opacityFor(numericW, threshold);
      const hidden = this._isBelowThreshold(numericW, threshold);
      const pos = gridLabelPositions[idx] || gridLabelPositions[gridLabelPositions.length - 1];
      return {
        entity,
        icon,
        color,
        val,
        opacity,
        hidden,
        xPct: pos.xPct,
        yPct: pos.yPct,
        numeric: numericW,
      };
    });

    const batteryLabelPositions = [
      { xPct: ((batteryIconX - 5) / baseWidth) * 100, yPct: pctGridY(46) },
      { xPct: ((batteryIconX - 5) / baseWidth) * 100, yPct: pctGridY(28) },
    ];
    const batteryLabelItems = batteryLabels.map((lbl, idx) => {
      const entity = lbl.entity || null;
      const attribute = lbl.attribute || null;
      const unitOverride = this._getUnitOverride(lbl);
      const icon = lbl.icon || this._getLabelIcon(entity, attribute, "mdi:tag-text-outline");
      const color = lbl.color || batteryColor;
      const numeric = this._getNumeric(entity, attribute);
      const decimals = this._getDecimalPlaces(lbl);
      const val = this._formatEntity(entity, decimals, attribute, unitOverride);
      const labelUnit =
        unitOverride ||
        this.hass?.states?.[entity]?.attributes?.unit_of_measurement ||
        "";
      const numericW = this._toWatts(numeric, labelUnit);
      const threshold = this._toWatts(this._parseThreshold(lbl.threshold), "W", true);
      const opacity = this._opacityFor(numericW, threshold);
      const hidden = this._isBelowThreshold(numericW, threshold);
      const pos = batteryLabelPositions[idx] || batteryLabelPositions[batteryLabelPositions.length - 1];
      return {
        entity,
        icon,
        color,
        val,
        opacity,
        hidden,
        xPct: pos.xPct,
        yPct: pos.yPct,
        numeric: numericW,
      };
    });

    const batteryDetails =
      batteryList.length > 1
        ? batteryItems
            .map((item) => {
              const cfg = item.cfg || {};
              const entity = cfg.entity || null;
              if (!entity) return null;
              const unitOverride = this._getUnitOverride(cfg);
              const decimals = this._getDecimalPlaces(cfg);
              const soc = this._getBatterySocValue(cfg);
              const icon = Number.isFinite(soc)
                ? this._getBatteryIcon(soc)
                : cfg.icon || this._getLabelIcon(entity, null, "mdi:battery");
              const color = cfg.color || batteryColor;
              const numericW = item.raw; // raw value for display
              const effectiveW = item.effective; // thresholded value for aggregation
              const threshold = item.threshold;
              const opacity = this._opacityFor(numericW, threshold);
              const hidden = this._isBelowThreshold(numericW, threshold);
              const displayVal = Number.isFinite(numericW)
                ? this._formatPowerWithOverride(Math.abs(numericW), decimals, "W", unitOverride ?? null)
                : this._formatEntity(entity, decimals, null, unitOverride);
              const arrow =
                numericW > 0 ? "mdi:arrow-left-bold" : numericW < 0 ? "mdi:arrow-right-bold" : null;
              return { entity, icon, color, val: displayVal, opacity, arrow, hidden };
            })
            .filter(Boolean)
        : [];
    const batteryDetailsLeft = (batteryIconX / baseWidth) * 100;
    const batteryNodeY = pctGridY(58); // anchor at main battery icon row
    const batteryDetailsOffsetPx = 44; // vertical gap from the icon/label to the multi list
    const batteryDetailsTop = batteryNodeY + (batteryDetailsOffsetPx / viewHeight) * 100;


    return html`
      <ha-card class="${[
        hasPv ? "" : "no-pv",
        hasBattery ? "" : "no-battery",
      ]
        .filter(Boolean)
        .join(" ")}">
        <div class="canvas">
          <svg viewBox="0 0 ${baseWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet">

          <!-- Flow lines, updated endpoints -->
          <path id="line-pv-grid" class="flow-line"
                d="M${sx(51.2)} ${syGridBatt(65)} H${pvLeftBendX} A8 8 0 0 0 ${pvLeftArcEndX} ${syGridBatt(58)} V${sy(52)}" fill="none" />
          <line id="line-pv-home" class="flow-line"
                x1="${homeCenterX}" y1="${sy(52)}" x2="${homeCenterX}" y2="${syHome(106)}" />
          <path id="line-pv-battery" class="flow-line"
                d="M${pvRightArcStartX} ${sy(52)} V${syGridBatt(58)} A8 8 0 0 0 ${pvRightArcEndX} ${syGridBatt(65)} H${sx(460.8)}" fill="none" />
          <path id="line-grid-home" class="flow-line"
                d="M${sx(51.2)} ${syGridBatt(81.3)} H${gridHomeH1X} Q${gridHomeEndX} ${syGridBatt(81.3)} ${gridHomeEndX} ${syGridBatt(96.8)} V${syHome(122.7)} H${gridHomeEndX}" fill="none" />
          <path id="line-home-battery" class="flow-line"
                d="M${homeBatteryStartX} ${syHome(122.7)} V${syGridBatt(96.8)} Q${homeBatteryStartX} ${syGridBatt(81.3)} ${homeBatteryCtrl2X} ${syGridBatt(81.3)} H${sx(460.8)}" fill="none" />

          <circle id="dot-pv-home"      r="5" fill="${pvColor}" opacity="0" />
          <path id="arc-grid-battery" class="flow-line"
                d="M${gridLineStartX} ${gridArcY} H${gridArcStartX} Q${gridArcCtrlX} ${gridArcCtrlY} ${gridArcEndX} ${gridArcY} H${gridLineEndX}"
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
                  <ha-icon icon="${lbl.icon}" style="gap: 0px; color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: calc(18px * var(--cpc-scale, 1)); filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                  <div class="aux-label" style="margin-top: -6px; padding-bottom: 0px; color:${lbl.color}; opacity:${lbl.hidden ? 0.35 : lbl.opacity};">${renderValue(lbl.val)}</div>
                </div>
              </div>`
            )}
            ${gridLabelItems.map(
              (lbl) => html`<div class="overlay-item anchor-left" style="left:${lbl.xPct}%; top:${lbl.yPct}%;">
                <div class="aux-marker clickable" style="flex-direction: row; gap: 4px;" @click=${() => this._openMoreInfo(lbl.entity || null)}>
                  <ha-icon icon="${lbl.icon}" style="color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: calc(16px * var(--cpc-scale, 1)); filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                  <div class="aux-label" style="color:${lbl.color}; opacity:${lbl.hidden ? 0.35 : lbl.opacity};">${renderValue(lbl.val)}</div>
                </div>
              </div>`
            )}
            ${hasBattery
              ? batteryLabelItems.map(
                  (lbl) => html`<div class="overlay-item anchor-right battery-label" style="margin-right: 10px; left:${lbl.xPct}%; top:${lbl.yPct}%;">
                    <div class="aux-marker clickable" style="flex-direction: row; gap: 4px;" @click=${() => this._openMoreInfo(lbl.entity || null)}>
                      <div class="aux-label" style="color:${lbl.color}; opacity:${lbl.hidden ? 0.35 : lbl.opacity};">${renderValue(lbl.val)}</div>
                      <ha-icon icon="${lbl.icon}" style="color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: calc(16px * var(--cpc-scale, 1)); filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                    </div>
                  </div>`
                )
              : ""}
            <div class="overlay-item pv-section" style="left:${(sx(256)/baseWidth)*100}%; top:${pctBaseY(24)}%;">
              <div class="node-marker pv-marker clickable" @click=${() => this._openMoreInfo(pvCfg.entity)}>
                <div class="node-label" style="color:${pvColor}; opacity:${pvLabelHidden ? 0.35 : pvOpacity};">${renderValue(pvVal)}</div>
                <ha-icon icon="mdi:solar-panel" style="color:${pvColor}; opacity:1; filter:${!this._isLightTheme() && pvNumeric !== 0 ? `drop-shadow(0 0 10px ${pvColor})` : "none"};"></ha-icon>
              </div>
            </div>
            <div class="overlay-item anchor-left" style="left:${(gridIconX/baseWidth)*100}%; top:${pctGridY(85)}%;">
              <div class="node-marker grid-marker left clickable" @click=${() => this._openMoreInfo(gridCfg.entity)}>
                <ha-icon icon="mdi:transmission-tower" style="color:${gridColor}; opacity:1; filter:${!this._isLightTheme() && gridNumeric !== 0 ? `drop-shadow(0 0 10px ${gridColor})` : "none"};"></ha-icon>
                <div class="node-label left" style="color:${gridColor}; opacity:${gridLabelHidden ? 0.35 : gridOpacity};">
                  ${gridArrow
                    ? html`<ha-icon class="inline-icon" icon="${gridArrow}" style="color:${gridColor}; opacity:${gridOpacity};"></ha-icon>`
                    : ""}
                  <span style="opacity:${gridOpacity};">${renderValue(gridVal)}</span>
                </div>
              </div>
            </div>
            <div class="overlay-item" style="left:${(homeCenterX/baseWidth)*100}%; top:${pctHomeY(135)}%;">
              <div class="home-marker clickable" @click=${() => this._openMoreInfo(homeCfg.entity)}>
                <ha-icon
                  icon="mdi:home"
                  style="color:${homeColor}; opacity:1;"
                ></ha-icon>
                <div class="home-label" style="color:${homeColor}; opacity:${homeLabelHidden ? 0.35 : homeOpacity};">${renderValue(homeVal)}</div>
              </div>
            </div>
            ${hasBattery
              ? html`<div class="overlay-item anchor-right battery-section" style="left:${(batteryIconX/baseWidth)*100}%; top:${pctGridY(85)}%;">
                  <div class="node-marker battery-marker right ${batteryDetails.length ? "" : "clickable"}" @click=${() => {
                    if (!batteryDetails.length) this._openMoreInfo(batteryCfg.entity);
                  }}>
                    <ha-icon icon="${batteryIcon}" style="color:${batteryColor}; opacity:${batteryIconOpacity}; filter:${!this._isLightTheme() && battNumericW !== 0 ? `drop-shadow(0 0 10px ${batteryColor})` : "none"};"></ha-icon>
                    <div class="node-label right" style="color:${batteryColor}; opacity:${batteryLabelHidden ? 0.35 : batteryLabelOpacity};">
                      ${battArrow
                        ? html`<ha-icon class="inline-icon" icon="${battArrow}" style="color:${batteryColor}; opacity:1;"></ha-icon>`
                        : ""}
                      <span style="opacity:1;">${renderValue(battVal)}</span>
                    </div>
                  </div>
                </div>`
              : ""}
            ${batteryDetails.length
              ? html`<div class="overlay-item anchor-right-top" style="left:${batteryDetailsLeft}%; top:${batteryDetailsTop}%;">
                  <div class="battery-multi" style="margin-right: 6px; margin-top: 6px;">
                    ${batteryDetails.map(
                      (b) => html`<div
                        class="battery-multi-item clickable"
                        style="margin-top: -6px; color:${b.color};"
                        @click=${() => this._openMoreInfo(b.entity)}
                      >
                        <div class="aux-label" style="padding-top: 0px; padding-bottom: 0px; margin-top: 4px; padding-left: 1px; padding-right: 1px; opacity:${b.hidden ? 0.35 : b.opacity};">
                          ${renderValue(b.val)}
                        </div>
                        <ha-icon icon="${b.icon}" style="color:${b.color}; opacity:1; --mdc-icon-size: calc(14px * var(--cpc-scale, 1));"></ha-icon>
                      </div>`
                    )}
                  </div>
                </div>`
              : ""}

            ${sources.map(
              (src) => html`<div class="overlay-item" style="left:${src.leftPct}%; top:${src.topPct}%;">
                <div class="aux-marker clickable" @click=${() => this._openMoreInfo(src.entity || null)}>
                  <ha-icon icon="${src.icon}" style="color:${src.color}; opacity:1; filter:${!this._isLightTheme() && src.numeric !== 0 ? `drop-shadow(0 0 10px ${src.color})` : "none"};"></ha-icon>
                  <div class="aux-label" style="color:${src.color}; opacity:${src.hidden ? 0.35 : src.opacity};">${renderValue(src.val)}</div>
                </div>
              </div>`
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("compact-power-card", CompactPowerCard);

// Register card metadata for the Lovelace card picker
if (window?.customCards) {
  const exists = window.customCards.some((c) => c.type === "compact-power-card");
  if (!exists) {
    window.customCards.push({
      type: "compact-power-card",
      name: "Compact Power Card",
      description: "Compact power flow card with PV, grid, battery, and home flows.",
      preview: false,
    });
  }
} else if (window) {
  window.customCards = [
    {
      type: "compact-power-card",
      name: "Compact Power Card",
      description: "Compact power flow card with PV, grid, battery, and home flows.",
      preview: false,
    },
  ];
}
