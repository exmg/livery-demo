// Import once for side effects, e.g: defining elements
// eslint-disable-next-line import/no-duplicates
import '@exmg/livery';
// And import again for TypeScript types (this will be stripped during compilation)
// eslint-disable-next-line import/no-duplicates
import { LiveryPlayer } from '@exmg/livery';
// Above should be clarifyable in TypeScript v3.8 using `import type { LiveryPlayer } from '@exmg/livery'`
// Then hopefully eslint and @typescript-eslint rules will not unjustfully complain about it anymore
import { html, LitElement, property } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { liveryDemoStyle } from './liveryDemoStyle';

function setSelected(select: HTMLSelectElement, value: string) {
  const options = Array.from(select.querySelectorAll('option'));
  for (const option of options) {
    option.selected = option.value === value;
  }
}

export class LiveryDemo extends LitElement {
  static defaultCustomer = '5ddb986ee4b0937e6a4507e9';

  static defaultLogLevel = 'info';

  static styles = liveryDemoStyle;

  static getConfig = (customerId: string, envSuffix: string) =>
    `https://cdn.playtotv.com/video-encoder${envSuffix}/remoteconfigs/${customerId}.json`;

  static getSource = (customerId: string) =>
    `https://exmachina-ull-demo.akamaized.net/cmaf/live/664379/${customerId}-TESTING/out.mpd`;

  static parseCustomer(customer: string) {
    const [customerId, envSuffix = ''] = customer.split('-');
    return { customerId, envSuffix };
  }

  @property({ type: Number })
  buffer = NaN;

  @property({ type: Number })
  latency = NaN;

  @property({ type: Number })
  playbackRate = 1;

  @property({ type: String })
  config: string;

  @property({ type: String })
  customer: string;

  @property({ type: String })
  customLatency?: string;

  @property({ type: String })
  customSource?: string;

  @property({ type: String })
  engineName = '';

  @property({ type: String })
  logLevel: string;

  @property({ type: String })
  playbackState = '';

  @property({ type: String })
  quality = '';

  @property({ type: String })
  source: string;

  $?: {
    customerSelect: HTMLSelectElement;
    latencyInput: HTMLInputElement;
    logSelect: HTMLSelectElement;
    player: LiveryPlayer;
    sourceInput: HTMLInputElement;
  };

  constructor() {
    super();

    const urlParams = new URLSearchParams(window.location.search);

    this.customer = urlParams.get('customer') || LiveryDemo.defaultCustomer;
    this.customSource = urlParams.get('source') || undefined;
    this.customLatency = urlParams.get('latency') || undefined;
    this.logLevel = urlParams.get('log') || LiveryDemo.defaultLogLevel;

    const { customerId, envSuffix } = LiveryDemo.parseCustomer(this.customer);
    this.config = LiveryDemo.getConfig(customerId, envSuffix);
    this.source = this.customSource || LiveryDemo.getSource(customerId);
  }

  firstUpdated(changedProperties: Map<PropertyKey, unknown>) {
    super.firstUpdated(changedProperties);

    const $ = <T extends Element>(selector: string) => {
      const element = this.renderRoot.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Could not find element with selector: ${selector}`);
      }
      return element;
    };

    this.$ = {
      customerSelect: $('#customer-select'),
      latencyInput: $('#latency-input'),
      logSelect: $('#log-select'),
      player: $('livery-player'),
      sourceInput: $('#source-input'),
    };

    setSelected(this.$.customerSelect, this.customer);
    setSelected(this.$.logSelect, this.logLevel);

    this.updateBufferAndLatency();
    this.updateEngineName();
    this.updatePlaybackRate();
    this.updatePlaybackState();
    this.updateQuality();
  }

  onCustomerChange(event: Event) {
    const customer = (event.target as HTMLSelectElement).value;
    const { customerId } = LiveryDemo.parseCustomer(customer);
    const source = LiveryDemo.getSource(customerId);
    this.$!.sourceInput.value = source;
  }

  // TODO: Replace use of form submit by having form input value changes updating livery elements directly
  // Do however change location using history.pushState so page can be reloaded and URL copy pasted
  // eslint-disable-next-line class-methods-use-this
  onFormSubmit(event: Event) {
    event.preventDefault();

    const urlParams = new URLSearchParams();

    const customer = this.$!.customerSelect.value;
    if (customer !== LiveryDemo.defaultCustomer) {
      urlParams.set('customer', customer);
    }

    const source = this.$!.sourceInput.value;
    const { customerId } = LiveryDemo.parseCustomer(customer);
    const customerSource = LiveryDemo.getSource(customerId);
    if (source && source !== customerSource) {
      urlParams.set('source', source);
    }

    const latency = this.$!.latencyInput.value;
    if (latency) {
      urlParams.set('latency', latency);
    }

    const logLevel = this.$!.logSelect.value;
    if (logLevel !== LiveryDemo.defaultLogLevel) {
      urlParams.set('log', logLevel);
    }

    const params = urlParams.toString();
    if (params) {
      window.location.search = params;
    } else {
      window.location.href = window.location.pathname;
    }
  }

  render() {
    return html`
      <div class="panel">
        <form id="form" @submit="${this.onFormSubmit}">
          <div class="input">
            <label for="customer-select">Customer:</label>
            <select id="customer-select" @change="${this.onCustomerChange}">
              <optgroup label="ExMG">
                <option value="5c8b790e8f08e4ad1d1dc339-staging"
                  >Angry Bytes</option
                >
                <option value="5c52edb53e930320967a5d55-dev">Ex Machina</option>
                <option value="5ddb986ee4b0937e6a4507e9">Livery Demo</option>
                <option value="5d931e67e4b0748e5a09b99f">Nerve</option>
              </optgroup>
            </select>
          </div>

          <div class="input source">
            <label for="source-input">Source:</label>
            <input
              id="source-input"
              type="url"
              list="sources"
              .value="${this.customSource || this.source}"
            />
            <datalist id="sources">
              <option
                value="https://akamaibroadcasteruseast.akamaized.net/cmaf/live/657078/akasource/out.mpd"
                >Akamai LLS
              </option>

              <!-- Source: https://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html -->
              <option
                value="https://livesim.dashif.org/livesim-chunked/chunkdur_1/ato_7/testpic4_8s/Manifest300.mpd"
              >
                DASH-IF LLS</option
              >
              <option
                value="https://livesim.dashif.org/livesim-chunked/chunkdur_1/ato_7/testpic4_8s/Manifest.mpd"
                >DASH-IF LLS ABR</option
              >
              <option
                value="https://vm2.dashif.org/livesim/testpic_2s/Manifest.mpd"
                >DASH-IF 2s</option
              >
            </datalist>
          </div>

          <div class="input latency">
            <label for="latency-input">Latency:</label>
            <input
              id="latency-input"
              type="number"
              min="0"
              step="0.1"
              .value="${this.customLatency}"
            />s
          </div>

          <div class="input">
            <label for="log-select">Log Level:</label>
            <select id="log-select">
              <option>error</option>
              <option>warn</option>
              <option>info</option>
              <option>debug</option>
              <option>spam</option>
            </select>
          </div>

          <div class="input submit">
            <input type="submit" value="Load" />
          </div>
        </form>
      </div>

      <div class="panel">
        <livery-sdk
          config="${this.config}"
          log-level="${this.logLevel}"
        ></livery-sdk>
        <livery-player
          autoplay-muted
          persist-muted
          controls="mute fullscreen quality"
          target-latency="${ifDefined(this.customLatency)}"
          @livery-activequalitychange="${() => this.updateQuality()}"
          @livery-playbackchange="${() => this.updatePlaybackState()}"
          @livery-progress="${() => this.updateBufferAndLatency()}"
          @livery-ratechange="${() => this.updatePlaybackRate()}"
          @livery-selectedqualitychange="${() => this.updateQuality()}"
          @livery-started="${() => this.updateEngineName()}"
          @livery-timeupdate="${() => this.updateBufferAndLatency()}"
        >
          <source src="${this.source}" />
        </livery-player>
      </div>

      <table class="panel">
        <tr>
          <th>Engine:</th>
          <td>
            ${this.engineName.replace(/Engine$/, '')}
          </td>
          <th>Playback:</th>
          <td>
            <span
              class="icon icon-${this.playbackState
                .toLowerCase()
                .replace(/_/g, '-')}"
            ></span>
            <span
              >${this.playbackRate === 1 ? '' : `${this.playbackRate}x`}</span
            >
          </td>
        </tr>
        <tr>
          <th>Buffer:</th>
          <td>
            ${Number.isNaN(this.buffer) ? '' : `${this.buffer.toFixed(1)}s`}
          </td>
          <th>Quality:</th>
          <td>${this.quality}</td>
        </tr>
        <tr>
          <th>Latency:</th>
          <td>
            ${Number.isNaN(this.latency) ? '' : `${this.latency.toFixed(1)}s`}
          </td>
        </tr>
      </table>

      <div class="panel">
        <livery-buffer-graph
          background-color="#444"
          buffer-color="#00bfff"
          latency-color="#ffa500"
          text-color="#eee"
          .player="${this.$ ? this.$.player : null}"
        ></livery-buffer-graph>
      </div>

      <div class="panel">
        <livery-log .player="${this.$ ? this.$.player : null}"></livery-log>
      </div>
    `;
  }

  updateBufferAndLatency() {
    this.buffer = this.$!.player.buffer;
    this.latency = this.$!.player.latency;
  }

  updateEngineName() {
    this.engineName = this.$!.player.engineName;
  }

  updatePlaybackRate() {
    this.playbackRate = this.$!.player.playbackRate;
  }

  updatePlaybackState() {
    this.playbackState = this.$!.player.playbackState;
  }

  updateQuality() {
    const {
      activeQuality: activeIndex,
      selectedQuality: selectedIndex,
      qualities,
    } = this.$!.player;

    const active = Number.isNaN(activeIndex) ? null : qualities[activeIndex];
    const selected = Number.isNaN(selectedIndex)
      ? null
      : qualities[selectedIndex];

    let selectedStr = '';
    if (qualities.length > 1) {
      if (selected) {
        if (!active || selectedIndex !== activeIndex) {
          selectedStr = `=> ${selected.label}`;
        }
      } else {
        selectedStr = '(auto)';
      }
    }

    this.quality = `${active ? active.label : ''} ${selectedStr}`;
  }
}
