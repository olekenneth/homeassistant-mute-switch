import hass, { HassApi } from "homeassistant-ws";

let muteButton: HTMLElement | null;
let buttonObserver: MutationObserver | null = null;

let ha_url: string, ha_token: string, ha_sensor: string, inverse: boolean;
let client: HassApi | null = null;

type NewState = {
  new_state: {
    entity_id: string;
    state: string;
  };
};

interface StateChange {
  data: NewState;
}

const queryMuteButton = () =>
  document.querySelector<HTMLElement>(
    [
      '[role=button][aria-label*="⌘+D" i]',
      '[role=button][aria-label*="⌘ + D" i]',
      '[role=button][aria-label*="Ctrl+D" i]',
      '[role=button][aria-label*="Ctrl + D" i]',
    ].join(",")
  );

const notifyMuteStateChange = async () => {
  if (muteButton) {
    const client = await hassConnection();
    try {
      await client?.callService(
        "homeassistant",
        "turn_" +
          (muteButton.dataset.isMuted === "false" && inverse ? "on" : "off"),
        {
          entity_id: ha_sensor,
        }
      );
    } catch (error) {
      client = undefined;
    }
  }
};

const toggleMute = () => {
  if (muteButton) {
    const ev = new MouseEvent("click", { bubbles: true });
    muteButton.dispatchEvent(ev);
  }
};

const hassConnection = async (): Promise<HassApi | null> => {
  if (client) return client;

  await new Promise((resolve) => {
    chrome.storage.sync.get(null, (opts) => {
      ha_url = opts.ha_url;
      ha_token = opts.ha_token;
      ha_sensor = opts.ha_sensor;
      inverse = opts.ha_inverse;
      resolve(void 0);
    });
  });

  if (!(ha_url && ha_token && ha_sensor)) {
    const toast = document.createElement("div") as HTMLDivElement;
    toast.setAttribute(
      "style",
      `box-shadow: rgba(255, 255, 255, 0.2) 0px 7px 29px 0px; background: #49A7EE; position: absolute; bottom: 10px; right: 10px; padding: 20px; z-index: 1`
    );
    toast.innerHTML =
      "<h1>Home Assistant Mute Switch</h1><p>Missing URL and token. Go to options. (Reload needed)</p>";
    document.body.append(toast);

    toast.addEventListener("click", () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL("html/options.html"));
      }
    });
    return null;
  }

  const url = new URL(ha_url);
  const port = url.port;

  client = await hass({
    token: ha_token,
    protocol: url.protocol == "https:" ? "wss" : "ws",
    host: url.hostname,
    port: port || url.protocol == "https:" ? 443 : 80,
    path: "/api/websocket",
  });

  client.on("state_changed", (stateChangedEvent: StateChange) => {
    const { entity_id, state } = stateChangedEvent.data.new_state;
    if (entity_id == ha_sensor) {
      if (muteButton?.dataset.isMuted != undefined) {
        const haState = state == "off" && inverse;
        const buttonState = muteButton.dataset.isMuted == "true";
        if (haState != buttonState) {
          toggleMute();
        }
      }
    }
  });

  return client;
};

const findMuteButton = () => {
  muteButton = queryMuteButton();
  if (!muteButton) {
    setTimeout(findMuteButton, 100);
    return;
  }

  notifyMuteStateChange();
  buttonObserver?.disconnect();

  buttonObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (muteButton && muteButton.dataset.isMuted !== m.oldValue) {
        notifyMuteStateChange();
      }
    }
  });

  buttonObserver.observe(muteButton, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ["data-is-muted"],
  });

  new MutationObserver((_mutations, observer) => {
    if (queryMuteButton() !== muteButton) {
      observer.disconnect();
      findMuteButton();
    }
  }).observe(document.body, { childList: true });

  return;
};

findMuteButton();
