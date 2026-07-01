const VERSION = "0.4.1";

const SUFFIXES = {
  door: ["_door_open", "_door"],
  ecoMode: ["_eco_friendly", "_vacation_mode"],
  notification: ["_notification"],
  freezerTemperature: ["_freezer_temperature"],
  fridgeTemperature: ["_fridge_temperature"],
  expressCool: ["_express_cool", "_quick_cool"],
  quickFreeze: [
    "_express_mode",
    "_quick_freeze",
    "_express_freeze",
    "_fast_freeze",
    "_schnellgefrieren",
    "_schnell_gefrieren",
  ],
};

const TEXT = {
  de: {
    loading: "Kühlschrank wird geladen …",
    missing: "Keine LG-ThinQ-Entitäten gefunden.",
    fridge: "Kühlteil",
    freezer: "Gefrierteil",
    target: "Solltemperatur",
    doorOpen: "Tür offen",
    doorClosed: "Tür geschlossen",
    ecoMode: "Eco / Urlaub",
    expressCool: "Express Cool",
    quickFreeze: "Schnellgefrieren",
    active: "Aktiv",
    off: "Aus",
    notification: "Hinweis",
    readOnly: "Status",
    events: {
      frozen_is_complete: "Gefriervorgang abgeschlossen",
      time_to_change_filter: "Filterwechsel erforderlich",
      water_filter_reset_complete: "Wasserfilter zurückgesetzt",
      time_to_change_water_filter: "Wasserfilterwechsel erforderlich",
      door_is_open: "Die Kühlschranktür ist offen",
      filter_reset_complete: "Filter zurückgesetzt",
    },
  },
  en: {
    loading: "Loading refrigerator …",
    missing: "No LG ThinQ entities found.",
    fridge: "Refrigerator",
    freezer: "Freezer",
    target: "Target temperature",
    doorOpen: "Door open",
    doorClosed: "Door closed",
    ecoMode: "Eco / Vacation",
    expressCool: "Express Cool",
    quickFreeze: "Quick Freeze",
    active: "Active",
    off: "Off",
    notification: "Notification",
    readOnly: "Status",
    events: {
      frozen_is_complete: "Freezing process completed",
      time_to_change_filter: "Filter replacement required",
      water_filter_reset_complete: "Water filter reset completed",
      time_to_change_water_filter: "Water-filter replacement required",
      door_is_open: "The refrigerator door is open",
      filter_reset_complete: "Filter reset completed",
    },
  },
};

class RefrigeratorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._entities = null;
    this._discovering = false;
    this._signature = "";
  }

  static getStubConfig() {
    return {
      type: "custom:refrigerator-card",
      device_id: "",
      title: "Kühlschrank",
    };
  }

  setConfig(config) {
    if (!config?.device_id && !config?.entities) {
      throw new Error("refrigerator-card requires device_id or entities");
    }
    this._config = {
      title: "Kühlschrank",
      show_notification: true,
      show_modes: true,
      show_temperature_controls: true,
      ...config,
    };
    this._entities = config.entities ? { ...config.entities } : null;
    this._discovering = false;
    this._signature = "";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._entities && !this._discovering && this._config?.device_id) {
      void this._discover();
    }
    const signature = this._stateSignature();
    if (signature !== this._signature) {
      this._signature = signature;
      this._render();
    }
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 6, min_rows: 4 };
  }

  get _language() {
    const language = this._hass?.locale?.language || this._hass?.language || "de";
    return String(language).toLowerCase().startsWith("de") ? "de" : "en";
  }

  get _text() {
    return TEXT[this._language];
  }

  async _discover() {
    this._discovering = true;
    this._render();
    try {
      const result = await this._hass.callWS({
        type: "config/entity_registry/list_for_display",
      });
      const registry = Array.isArray(result) ? result : result?.entities || [];
      const ids = registry
        .filter((entry) => {
          const device = entry.di || entry.device_id;
          const platform = entry.pl || entry.platform;
          return device === this._config.device_id && platform === "lg_thinq";
        })
        .map((entry) => entry.ei || entry.entity_id)
        .filter(Boolean);

      this._entities = {};
      for (const [key, suffixes] of Object.entries(SUFFIXES)) {
        const id = ids.find((candidate) =>
          suffixes.some((suffix) => candidate.endsWith(suffix)),
        );
        if (id) this._entities[key] = id;
      }
    } catch (error) {
      console.error("refrigerator-card discovery failed", error);
      this._entities = {};
    } finally {
      this._discovering = false;
      this._signature = "";
      this._render();
    }
  }

  _stateSignature() {
    if (!this._hass || !this._entities) return "";
    const relevant = {};
    for (const [key, id] of Object.entries(this._entities)) {
      const state = this._hass.states[id];
      relevant[key] = state
        ? [
            state.state,
            state.attributes?.min,
            state.attributes?.max,
            state.attributes?.step,
            state.attributes?.event_type,
          ]
        : null;
    }
    return JSON.stringify(relevant);
  }

  _state(key) {
    const id = this._entities?.[key];
    return id ? this._hass?.states?.[id] : undefined;
  }

  _available(key) {
    const state = this._state(key);
    return Boolean(state && !["unknown", "unavailable"].includes(state.state));
  }

  _domain(key) {
    const id = this._entities?.[key] || "";
    return id.split(".", 1)[0];
  }

  _canToggle(key) {
    return this._domain(key) === "switch";
  }

  _on(key) {
    return this._state(key)?.state === "on";
  }

  _doorOpen() {
    return this._state("door")?.state === "on";
  }

  _number(key) {
    const value = Number(this._state(key)?.state);
    return Number.isFinite(value) ? value : null;
  }

  _eventType() {
    const value = this._state("notification")?.attributes?.event_type;
    if (!value || ["none", "unknown", "unavailable"].includes(String(value))) {
      return "";
    }
    return String(value);
  }

  _eventLabel(eventType) {
    if (!eventType) return "";
    return (
      this._text.events[eventType] ||
      eventType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    if (!this._hass || this._discovering) {
      this.shadowRoot.innerHTML = this._frame(
        `<div class="message"><span class="spinner"></span>${this._text.loading}</div>`,
      );
      return;
    }
    if (!this._entities || !Object.keys(this._entities).length) {
      this.shadowRoot.innerHTML = this._frame(
        `<div class="message error"><ha-icon icon="mdi:alert-circle-outline"></ha-icon>${this._text.missing}</div>`,
      );
      return;
    }

    const doorOpen = this._doorOpen();
    const eventType = this._eventType();
    const accent = this._config.accent_color || "#4fc3f7";

    this.shadowRoot.innerHTML = this._frame(`
      <div class="card" style="--accent:${this._escape(accent)}">
        <header>
          <div>
            <div class="title">${this._escape(this._config.title)}</div>
            <div class="subtitle">LG ThinQ</div>
          </div>
          ${
            this._state("door")
              ? `<button class="door-status ${doorOpen ? "open" : "closed"}" data-info="door">
                  <ha-icon icon="${doorOpen ? "mdi:fridge-alert-outline" : "mdi:fridge-outline"}"></ha-icon>
                  ${doorOpen ? this._text.doorOpen : this._text.doorClosed}
                </button>`
              : ""
          }
        </header>

        ${
          this._config.show_notification && eventType
            ? `<button class="notification" data-info="notification">
                <ha-icon icon="mdi:bell-alert-outline"></ha-icon>
                <span><small>${this._text.notification}</small>${this._escape(this._eventLabel(eventType))}</span>
              </button>`
            : ""
        }

        <div class="hero ${doorOpen ? "door-open" : ""}">
          <div class="appliance">
            <div class="fridge-shape">
              <div class="upper"><ha-icon icon="mdi:snowflake-thermometer"></ha-icon></div>
              <div class="divider"></div>
              <div class="lower"><ha-icon icon="mdi:snowflake"></ha-icon></div>
              <span class="handle"></span>
            </div>
            ${doorOpen ? '<div class="door-glow"></div>' : ""}
          </div>
          <div class="zones">
            ${this._temperatureZone("fridgeTemperature", this._text.fridge, "mdi:fridge-top")}
            ${this._temperatureZone("freezerTemperature", this._text.freezer, "mdi:fridge-bottom")}
          </div>
        </div>

        ${this._modeControls()}
      </div>
    `);
    this._bind();
  }

  _temperatureZone(key, label, icon) {
    const state = this._state(key);
    if (!state) return "";
    const value = Number(state.state);
    const available = Number.isFinite(value) && !["unknown", "unavailable"].includes(state.state);
    const unit = state.attributes?.unit_of_measurement || "°C";
    const min = Number(state.attributes?.min);
    const max = Number(state.attributes?.max);
    const step = Number(state.attributes?.step ?? 1);
    const controlAvailable =
      available && [min, max, step].every(Number.isFinite) && this._config.show_temperature_controls;

    return `<section class="zone ${key === "freezerTemperature" ? "freezer" : "fridge"}">
      <div class="zone-heading">
        <ha-icon icon="${icon}"></ha-icon>
        <span><b>${label}</b><small>${this._text.target}</small></span>
        <button class="temperature-value" data-info="${key}">${available ? `${this._escape(value)} ${this._escape(unit)}` : "—"}</button>
      </div>
      ${
        controlAvailable
          ? `<div class="range">
              <span>${this._escape(min)}°</span>
              <input type="range" data-temperature="${key}" min="${min}" max="${max}" step="${step}" value="${value}">
              <span>${this._escape(max)}°</span>
              <output data-output="${key}">${this._escape(value)} ${this._escape(unit)}</output>
            </div>`
          : ""
      }
    </section>`;
  }

  _modeControls() {
    if (!this._config.show_modes) return "";
    const definitions = [
      ["ecoMode", this._text.ecoMode, "mdi:leaf-circle-outline"],
      ["expressCool", this._text.expressCool, "mdi:snowflake-melt"],
      ["quickFreeze", this._text.quickFreeze, "mdi:snowflake-alert"],
    ];
    const controls = definitions
      .filter(([key]) => this._state(key))
      .map(([key, label, icon]) => {
        const active = this._on(key);
        const toggle = this._canToggle(key);
        return `<button class="mode ${active ? "active" : ""} ${toggle ? "interactive" : "readonly"}"
          ${toggle ? `data-toggle="${key}"` : `data-info="${key}"`}>
          <ha-icon icon="${icon}"></ha-icon>
          <span><b>${label}</b><small>${active ? this._text.active : this._text.off}${toggle ? "" : ` · ${this._text.readOnly}`}</small></span>
        </button>`;
      })
      .join("");
    return controls
      ? `<section class="modes"><div class="mode-grid">${controls}</div></section>`
      : "";
  }

  _bind() {
    this.shadowRoot.querySelectorAll("[data-info]").forEach((element) => {
      element.addEventListener("click", () => this._moreInfo(element.dataset.info));
    });

    this.shadowRoot.querySelectorAll("[data-toggle]").forEach((element) => {
      element.addEventListener("click", () =>
        this._service("homeassistant", "toggle", {
          entity_id: this._entities[element.dataset.toggle],
        }),
      );
    });

    this.shadowRoot.querySelectorAll("[data-temperature]").forEach((element) => {
      element.addEventListener("input", (event) => {
        const key = event.target.dataset.temperature;
        const output = this.shadowRoot.querySelector(`[data-output="${key}"]`);
        const unit = this._state(key)?.attributes?.unit_of_measurement || "°C";
        if (output) output.value = `${event.target.value} ${unit}`;
      });
      element.addEventListener("change", (event) => {
        const key = event.target.dataset.temperature;
        void this._service("number", "set_value", {
          entity_id: this._entities[key],
          value: Number(event.target.value),
        });
      });
    });
  }

  _moreInfo(key) {
    const entityId = this._entities?.[key];
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  async _service(domain, service, data) {
    try {
      await this._hass.callService(domain, service, data);
    } catch (error) {
      console.error(`refrigerator-card ${domain}.${service} failed`, error);
    }
  }

  _frame(content) {
    return `<style>
      :host{display:block;container-type:inline-size}ha-card{overflow:hidden}.card{padding:20px;color:var(--primary-text-color)}
      header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}.title{font-size:1.25rem;font-weight:750}.subtitle{color:var(--secondary-text-color);margin-top:3px}.door-status{border:0;border-radius:999px;padding:8px 11px;display:flex;align-items:center;gap:7px;cursor:pointer;background:var(--secondary-background-color);color:var(--secondary-text-color)}.door-status.open{color:var(--error-color,#db4437);background:color-mix(in srgb,var(--error-color,#db4437) 13%,var(--secondary-background-color));animation:doorPulse 1.8s ease-in-out infinite}.door-status.closed{color:var(--success-color,#43a047)}
      .notification{width:100%;border:1px solid color-mix(in srgb,var(--warning-color,#f9a825) 45%,var(--divider-color));border-radius:13px;background:color-mix(in srgb,var(--warning-color,#f9a825) 12%,var(--card-background-color));color:inherit;padding:12px 14px;display:flex;align-items:center;gap:11px;text-align:left;cursor:pointer;margin-bottom:14px}.notification ha-icon{color:var(--warning-color,#f9a825)}.notification span{display:flex;flex-direction:column}.notification small{color:var(--secondary-text-color);margin-bottom:2px}
      .hero{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:stretch}.appliance{position:relative;display:grid;place-items:center;min-height:240px}.fridge-shape{width:104px;height:214px;border-radius:20px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 12%,var(--secondary-background-color)),var(--secondary-background-color));box-shadow:inset 0 0 0 1px var(--divider-color),0 16px 35px rgba(0,0,0,.14);position:relative;overflow:hidden;color:var(--accent)}.upper,.lower{display:grid;place-items:center}.upper{height:61%}.lower{height:39%}.upper ha-icon{--mdc-icon-size:48px}.lower ha-icon{--mdc-icon-size:38px}.divider{height:2px;background:var(--divider-color)}.handle{position:absolute;right:10px;top:24px;width:4px;height:66px;border-radius:4px;background:color-mix(in srgb,var(--primary-text-color) 24%,transparent)}.door-glow{position:absolute;width:125px;height:235px;border-radius:26px;box-shadow:0 0 30px color-mix(in srgb,var(--error-color,#db4437) 35%,transparent);pointer-events:none}.door-open .fridge-shape{transform:perspective(400px) rotateY(-5deg);transition:transform .3s}
      .zones{display:grid;gap:11px}.zone{border:1px solid var(--divider-color);border-radius:15px;padding:14px;background:color-mix(in srgb,var(--secondary-background-color) 82%,transparent)}.zone-heading{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}.zone-heading>ha-icon{color:var(--accent)}.zone-heading span{display:flex;flex-direction:column}.zone-heading small{color:var(--secondary-text-color);margin-top:2px}.temperature-value{border:0;background:transparent;color:var(--primary-text-color);font-size:1.35rem;font-weight:750;cursor:pointer;padding:5px}.freezer .zone-heading>ha-icon{color:#7dd3fc}.range{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:15px;color:var(--secondary-text-color);font-size:.75rem}.range input{width:100%;accent-color:var(--accent)}.range output{grid-column:1/-1;text-align:center;color:var(--primary-text-color);font-weight:650;margin-top:2px}
      .modes{border-top:1px solid var(--divider-color);margin-top:16px;padding-top:14px}.mode-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mode{border:1px solid var(--divider-color);border-radius:12px;background:var(--secondary-background-color);color:inherit;padding:11px;display:flex;align-items:center;gap:9px;text-align:left}.mode.interactive,.mode.readonly{cursor:pointer}.mode ha-icon{color:var(--secondary-text-color)}.mode span{display:flex;flex-direction:column;min-width:0}.mode b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mode small{color:var(--secondary-text-color);margin-top:2px}.mode.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--secondary-background-color))}.mode.active ha-icon{color:var(--accent)}
      .message{min-height:140px;padding:24px;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--secondary-text-color)}.error{color:var(--error-color,#db4437)}.spinner{width:24px;height:24px;border:3px solid var(--divider-color);border-top-color:var(--primary-color);border-radius:50%;animation:spin .8s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}@keyframes doorPulse{50%{transform:scale(1.03)}}
      @container(max-width:520px){.card{padding:16px}.hero{grid-template-columns:1fr}.appliance{min-height:205px}.fridge-shape{height:190px;width:94px}.door-glow{height:211px;width:114px}.mode-grid{grid-template-columns:1fr}.zones{grid-template-columns:1fr 1fr}.zone-heading{grid-template-columns:auto 1fr}.temperature-value{grid-column:1/-1;text-align:left;padding-left:0}}
      @container(max-width:380px){header{align-items:stretch;flex-direction:column}.door-status{align-self:flex-start}.zones{grid-template-columns:1fr}.mode-grid{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
    </style><ha-card>${content}</ha-card>`;
  }
}

if (!customElements.get("refrigerator-card")) {
  customElements.define("refrigerator-card", RefrigeratorCard);
}
globalThis.customCards = globalThis.customCards || [];
const matchesEntity = (entity, terms) => {
  const entityId = String(entity?.entity_id || entity || "").toLowerCase();
  const name = String(entity?.attributes?.friendly_name || entity?.name || "").toLowerCase();
  return terms.some((term) => entityId.includes(term) || name.includes(term));
};

globalThis.customCards.push({
  type: "refrigerator-card",
  name: "LG ThinQ Refrigerator Card",
  description: "LG ThinQ refrigerator control card",
  preview: true,
  getEntitySuggestion: (hass, entityId) => {
    if (!matchesEntity(hass.states?.[entityId], ["refrigerator", "fridge", "freezer", "kuhlschrank", "kühlschrank", "lg_thinq"])) return null;
    return {
      config: {
        type: "custom:refrigerator-card",
        entity: entityId,
      },
    };
  },
});
console.info(
  `%c REFRIGERATOR-CARD %c ${VERSION} `,
  "color:#fff;background:#0288d1;font-weight:700",
  "color:#0288d1;background:#fff;font-weight:700",
);
