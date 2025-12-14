class CompactPowerCard extends (window.LitElement ||
  Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))) {

  static get properties() {
    return {
      hass: {},
      _config: {},
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
    return this.css`
      :host {
        --cpc-scale: 1;
      }

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
        --mdc-icon-size: calc(26px * var(--cpc-scale, 1));
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
    const hostWidth = this.getBoundingClientRect ? this.getBoundingClientRect().width : null;
    if (!hostWidth || hostWidth < 200) {
      this.style.setProperty("--cpc-scale", "1");
      return;
    }
    const baseWidth = 500; // keep full size for typical widths; only shrink below this
    const linearScale = hostWidth / baseWidth;
    const scale =
      hostWidth >= baseWidth
        ? 1
        : Math.max(0.8, Math.min(1, linearScale));
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
    const raw = Number(this._config?.height_factor ?? 1);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    return raw;
  }

  _getEffectiveHeightFactor(batteryCount = 1) {
    const userFactor = this._getHeightFactor();
    const minFactor = 1 + 0.26 * Math.max(0, batteryCount - 1);
    return Math.max(userFactor, minFactor);
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
    const baseHeight = 240;
    const heightFactor = this._getEffectiveHeightFactor(batteryList.length);
    const homeShift = (heightFactor - 1) * baseHeight;
    const gridBatteryShift = (heightFactor - 1) * baseHeight * 0.5; // keep grid/battery higher than home
    const syHome = (v) => v + homeShift;
    const syGridBatt = (v) => v + gridBatteryShift;
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
    const batteryBaseW = batteryMetas.reduce((sum, meta, idx) => {
      const cfg = batteryList[idx] || {};
      const invert = Boolean(cfg?.invert_state_values || invertBattery);
      const thr = this._toWatts(this._parseThreshold(cfg.threshold), "W", true);
      const raw = invert ? -meta.watts : meta.watts;
      const val = useThresholdForCalc ? applyThreshold(raw, thr) : raw;
      return sum + val;
    }, 0);

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

    // Geometry updated for marker positions:
    // PV marker anchor around (300,75) – below icon/label
    // GRID marker anchor around (60,75) inset to allow label width near edge
    // HOME marker anchor around (300,150)
    // BATTERY marker anchor around (540,75) inset equally to allow label width
    const geom = {
      "pv-grid": { mode: "line", x1: 290, y1: 70, x2: 60, y2: syGridBatt(86) },
      "pv-home": { mode: "line", x1: 300, y1: 70, x2: 300, y2: syHome(140) },
      "pv-battery": { mode: "line", x1: 310, y1: 70, x2: 540, y2: syGridBatt(86) },

      "grid-home": { mode: "path", pathId: "line-grid-home" },
      "battery-home": { mode: "line", x1: 540, y1: syGridBatt(106), x2: 320, y2: syHome(160) },

      "grid-battery": { mode: "line", x1: 60, y1: syGridBatt(96), x2: 540, y2: syGridBatt(96) },
      "battery-grid": { mode: "line", x1: 540, y1: syGridBatt(96), x2: 60, y2: syGridBatt(96) },
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

    let gridExportRemaining = Math.max(gridExport - pvToGrid, 0);

    // If PV already covers all export, reserve room to show battery export first
    if (
      battDischargeAfterHome > threshold &&
      gridExport > threshold &&
      gridExportRemaining <= threshold
    ) {
      const batteryToGrid = Math.min(battDischargeAfterHome, gridExport);
      const pvGridShare = Math.max(gridExport - batteryToGrid, 0);

      if (pvGridShare > threshold) {
        active["pv-grid"] = {
          geom: geom["pv-grid"],
          magnitude: pvGridShare,
          color: pvColor,
        };
      } else {
        delete active["pv-grid"];
      }

      gridExportRemaining = Math.max(gridExport - pvGridShare, 0);
      const batteryExportMag = Math.min(batteryToGrid, gridExportRemaining);
      if (batteryExportMag > threshold) {
        active["battery-grid"] = {
          geom: geom["battery-grid"],
          magnitude: batteryExportMag,
          color: batteryColor,
        };
      }
    } else if (battDischargeAfterHome > threshold && gridExportRemaining > threshold) {
      const batteryToGrid = Math.min(battDischargeAfterHome, gridExportRemaining);
      active["battery-grid"] = {
        geom: geom["battery-grid"],
        magnitude: batteryToGrid,
        color: batteryColor,
      };
    }

    // When exporting to grid and battery is discharging, prefer battery → home first,
    // then PV fills remaining home, and PV surplus exports. Suppress battery → grid.
    if (gridExport > threshold && battDischarge > threshold) {
      const batteryToHomeAdj = Math.min(battDischarge, Math.max(homeEffective, 0));
      const remainingHomeNeedAdj = Math.max(homeEffective - batteryToHomeAdj, 0);
      const pvToHomeAdj = Math.min(pvFlow, remainingHomeNeedAdj);
      const pvSurplusAdj = Math.max(pvFlow - pvToHomeAdj, 0);
      const pvToGridAdj = Math.min(pvSurplusAdj, gridExport);

      if (batteryToHomeAdj > threshold) {
        active["battery-home"] = {
          geom: geom["battery-home"],
          magnitude: batteryToHomeAdj,
          color: batteryColor,
        };
      } else {
        delete active["battery-home"];
      }

      if (pvToHomeAdj > threshold) {
        active["pv-home"] = {
          geom: geom["pv-home"],
          magnitude: pvToHomeAdj,
          color: pvColor,
        };
      } else {
        delete active["pv-home"];
      }

      if (pvToGridAdj > threshold) {
        active["pv-grid"] = {
          geom: geom["pv-grid"],
          magnitude: pvToGridAdj,
          color: pvColor,
        };
      } else {
        delete active["pv-grid"];
      }

      delete active["battery-grid"];
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
    const baseWidth = 600;
    const baseHeight = 240;
    const heightFactor = this._getEffectiveHeightFactor(batteryList.length);
    const homeShift = (heightFactor - 1) * baseHeight;
    const gridBatteryShift = (heightFactor - 1) * baseHeight * 0.5;
    const syHome = (v) => v + homeShift;
    const syGridBatt = (v) => v + gridBatteryShift;
    const viewHeight = baseHeight * heightFactor;
    const pctBaseY = (v) => (v / viewHeight) * 100; // PV: stay near top as view grows
    const pctGridY = (v) => ((v + gridBatteryShift) / viewHeight) * 100;
    const pctGridFixed = (v) => (v / baseHeight) * 100; // keep label anchors stable when height grows
    const pctHomeY = (v) => ((v + homeShift) / viewHeight) * 100;

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

    const pvDisplayUnit = "W";
    const pvState = this.hass?.states?.[pvCfg.entity]?.state;
    const pvVal = Number.isFinite(pvNumericW)
      ? this._formatPower(pvNumericW, pvDisplayUnit, pvDecimals, pvUnitOverride ?? null)
      : this._formatEntity(pvCfg.entity, pvDecimals, null, pvUnitOverride);
    const gridDisplayUnit = "W";
    const battUnit = "W";
    const battSocEntity = null;
    const battSocLabel = null;
    const battNumericW = batteryList.reduce((sum, cfg) => {
      const unit =
        this._getUnitOverride(cfg) ||
        (cfg.entity && this.hass?.states?.[cfg.entity]?.attributes?.unit_of_measurement) ||
        battUnit;
      const raw = this._getNumeric(cfg.entity);
      const inverted = (cfg?.invert_state_values || invertBattery) ? -raw : raw;
      return sum + this._toWatts(inverted, unit);
    }, 0);
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
      ? this._formatPower(Math.abs(gridNumericW), gridDisplayUnit, gridDecimals, gridUnitOverride ?? null)
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
      ? this._formatPower(Math.abs(battDisplay), battUnit, batteryDecimals, batteryUnitOverride ?? null)
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
      ? this._formatPower(homeNumericW, homeUnit, homeDecimals, homeUnitOverride ?? null)
      : this._formatEntity(homeCfg.entity, homeDecimals, null, homeUnitOverride);
    if (!forceRawHome && this._homeEffective != null) {
      const effectiveDisplay = homeEffectiveW;
      homeVal = this._formatPower(effectiveDisplay, homeUnit, homeDecimals, homeUnitOverride ?? null);
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
    const homeX = 300;
    const homeRowY = 190; // align with home marker vertically (aux row, base reference)
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
      const numericW = this._toWatts(numeric, unit);
      const unitOverride = this._getUnitOverride(src);
      let val = Number.isFinite(numericW)
        ? this._formatPower(numericW, "W", decimals, unitOverride ?? null)
        : this._formatEntity(entity, decimals, attribute, unitOverride);
      const color = src.color || homeColor;
      const pos = sourcePositions[idx] || { x: homeX, y: homeRowY };
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
      { x: 260, anchor: "anchor-right" },
      { x: 340, anchor: "anchor-left" },
    ];
    const pvLabelY = 36;
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
      { xPct: (32 / baseWidth) * 100, yPct: pctGridY(60) },
      { xPct: (32 / baseWidth) * 100, yPct: pctGridY(36) },
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
      { xPct: (566 / baseWidth) * 100, yPct: pctGridY(60) },
      { xPct: (566 / baseWidth) * 100, yPct: pctGridY(36) },
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
        ? batteryList
            .map((cfg) => {
              const entity = cfg.entity || null;
              if (!entity) return null;
              const unitOverride = this._getUnitOverride(cfg);
              const decimals = this._getDecimalPlaces(cfg);
              const soc = this._getBatterySocValue(cfg);
              const icon = Number.isFinite(soc)
                ? this._getBatteryIcon(soc)
                : cfg.icon || this._getLabelIcon(entity, null, "mdi:battery");
              const color = cfg.color || batteryColor;
              const unit =
                unitOverride ||
                this.hass?.states?.[entity]?.attributes?.unit_of_measurement ||
                battUnit;
              const raw = this._getNumeric(entity);
              const inverted = (cfg?.invert_state_values || invertBattery) ? -raw : raw;
              const numericW = this._toWatts(inverted, unit);
              const threshold = this._toWatts(this._parseThreshold(cfg.threshold), "W", true);
              const opacity = this._opacityFor(numericW, threshold);
              const hidden = this._isBelowThreshold(numericW, threshold);
              const val = Number.isFinite(numericW)
                ? this._formatPower(Math.abs(numericW), "W", decimals, unitOverride ?? null)
                : this._formatEntity(entity, decimals, null, unitOverride);
              const arrow =
                inverted > 0 ? "mdi:arrow-left-bold" : inverted < 0 ? "mdi:arrow-right-bold" : null;
              return { entity, icon, color, val, opacity, arrow, hidden };
            })
            .filter(Boolean)
        : [];
    const batteryDetailsLeft = batteryLabelPositions?.[0]?.xPct ?? (566 / baseWidth) * 100;
    const batteryNodeY = pctGridY(76); // anchor at main battery icon row
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
          <svg viewBox="0 0 600 ${viewHeight}" preserveAspectRatio="xMidYMid meet">

          <!-- Flow lines, updated endpoints -->
          <path id="line-pv-grid" class="flow-line"
                d="M60 ${syGridBatt(86)} H282 A8 8 0 0 0 290 ${syGridBatt(78)} V70" fill="none" />
          <line id="line-pv-home" class="flow-line"
                x1="300" y1="70" x2="300" y2="${syHome(140)}" />
          <path id="line-pv-battery" class="flow-line"
                d="M310 70 V${syGridBatt(78)} A8 8 0 0 0 318 ${syGridBatt(86)} H540" fill="none" />
          <path id="line-grid-home" class="flow-line"
                d="M60 ${syGridBatt(106)} H260 Q280 ${syGridBatt(106)} 280 ${syGridBatt(126)} V${syHome(160)}" fill="none" />
          <path id="line-home-battery" class="flow-line"
                d="M320 ${syHome(160)} V${syGridBatt(126)} Q320 ${syGridBatt(106)} 340 ${syGridBatt(106)} H540" fill="none" />

          <circle id="dot-pv-home"      r="5" fill="${pvColor}" opacity="0" />
          <path id="arc-grid-battery" class="flow-line"
                d="M60 ${syGridBatt(96)} H285 Q300 ${syGridBatt(76)} 315 ${syGridBatt(96)} H540"
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
                  <div class="aux-label" style="margin-top: -6px; padding-bottom: 0px; color:${lbl.color}; opacity:${lbl.hidden ? 0 : lbl.opacity};">${renderValue(lbl.val)}</div>
                </div>
              </div>`
            )}
            ${gridLabelItems.map(
              (lbl) => html`<div class="overlay-item anchor-left" style="left:${lbl.xPct}%; top:${lbl.yPct}%;">
                <div class="aux-marker clickable" style="flex-direction: row; gap: 4px;" @click=${() => this._openMoreInfo(lbl.entity || null)}>
                  <ha-icon icon="${lbl.icon}" style="color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: calc(16px * var(--cpc-scale, 1)); filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                  <div class="aux-label" style="color:${lbl.color}; opacity:${lbl.hidden ? 0 : lbl.opacity};">${renderValue(lbl.val)}</div>
                </div>
              </div>`
            )}
            ${hasBattery
              ? batteryLabelItems.map(
                  (lbl) => html`<div class="overlay-item anchor-right battery-label" style="left:${lbl.xPct}%; top:${lbl.yPct}%;">
                    <div class="aux-marker clickable" style="flex-direction: row; gap: 4px;" @click=${() => this._openMoreInfo(lbl.entity || null)}>
                      <div class="aux-label" style="color:${lbl.color}; opacity:${lbl.hidden ? 0 : lbl.opacity};">${renderValue(lbl.val)}</div>
                      <ha-icon icon="${lbl.icon}" style="color:${lbl.color}; opacity:${lbl.opacity}; --mdc-icon-size: calc(16px * var(--cpc-scale, 1)); filter:${!this._isLightTheme() && lbl.numeric !== 0 ? `drop-shadow(0 0 8px ${lbl.color})` : "none"};"></ha-icon>
                    </div>
                  </div>`
                )
              : ""}
            <div class="overlay-item pv-section" style="left:${(300/baseWidth)*100}%; top:${pctBaseY(36)}%;">
              <div class="node-marker pv-marker clickable" @click=${() => this._openMoreInfo(pvCfg.entity)}>
                <div class="node-label" style="color:${pvColor}; opacity:${pvLabelHidden ? 0 : pvOpacity};">${renderValue(pvVal)}</div>
                <ha-icon icon="mdi:solar-panel" style="color:${pvColor}; opacity:1; filter:${!this._isLightTheme() && pvNumeric !== 0 ? `drop-shadow(0 0 10px ${pvColor})` : "none"};"></ha-icon>
              </div>
            </div>
            <div class="overlay-item anchor-left" style="left:${(26/baseWidth)*100}%; top:${pctGridY(108)}%;">
              <div class="node-marker grid-marker left clickable" @click=${() => this._openMoreInfo(gridCfg.entity)}>
                <ha-icon icon="mdi:transmission-tower" style="color:${gridColor}; opacity:1; filter:${!this._isLightTheme() && gridNumeric !== 0 ? `drop-shadow(0 0 10px ${gridColor})` : "none"};"></ha-icon>
                <div class="node-label left" style="color:${gridColor}; opacity:${gridLabelHidden ? 0 : gridOpacity};">
                  ${gridArrow
                    ? html`<ha-icon class="inline-icon" icon="${gridArrow}" style="color:${gridColor}; opacity:${gridOpacity};"></ha-icon>`
                    : ""}
                  <span style="opacity:${gridOpacity};">${renderValue(gridVal)}</span>
                </div>
              </div>
            </div>
            <div class="overlay-item" style="left:${(300/baseWidth)*100}%; top:${pctHomeY(176)}%;">
              <div class="home-marker clickable" @click=${() => this._openMoreInfo(homeCfg.entity)}>
                <ha-icon
                  icon="mdi:home"
                  style="color:${homeColor}; opacity:1;"
                ></ha-icon>
                <div class="home-label" style="color:${homeColor}; opacity:${homeLabelHidden ? 0 : homeOpacity};">${renderValue(homeVal)}</div>
              </div>
            </div>
            ${hasBattery
              ? html`<div class="overlay-item anchor-right battery-section" style="left:${(572/baseWidth)*100}%; top:${pctGridY(108)}%;">
                  <div class="node-marker battery-marker right ${batteryDetails.length ? "" : "clickable"}" @click=${() => {
                    if (!batteryDetails.length) this._openMoreInfo(batteryCfg.entity);
                  }}>
                    <ha-icon icon="${batteryIcon}" style="color:${batteryColor}; opacity:${batteryIconOpacity}; filter:${!this._isLightTheme() && battNumericW !== 0 ? `drop-shadow(0 0 10px ${batteryColor})` : "none"};"></ha-icon>
                    <div class="node-label right" style="color:${batteryColor}; opacity:${batteryLabelHidden ? 0 : batteryLabelOpacity};">
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
                  <div class="battery-multi" style="margin-top: 14px;">
                    ${batteryDetails.map(
                      (b) => html`<div
                        class="battery-multi-item clickable"
                        style="color:${b.color}; opacity:${b.opacity};"
                        @click=${() => this._openMoreInfo(b.entity)}
                      >
                        <div class="aux-label" style="padding-top: 0px; padding-bottom: 0px; margin-top: 4px; padding-left: 1px; padding-right: 1px;">
                          ${renderValue(b.val)}
                        </div>
                        ${b.arrow
                          ? html`<ha-icon class="inline-icon" icon="${b.arrow}" style="color:${b.color}; opacity:${b.opacity}; --mdc-icon-size: calc(14px * var(--cpc-scale, 1));"></ha-icon>`
                          : ""}
                        <ha-icon icon="${b.icon}" style="color:${b.color}; opacity:${b.opacity}; --mdc-icon-size: calc(14px * var(--cpc-scale, 1));"></ha-icon>
                      </div>`
                    )}
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
