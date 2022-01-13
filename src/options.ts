const getElementById = (elementId: string) => {
  const el = document.getElementById(elementId);
  return (el as HTMLInputElement) || undefined;
};
function save_options() {
  const ha_url = getElementById("ha_url")?.value;
  const ha_token = getElementById("ha_token")?.value;
  const ha_sensor = getElementById("ha_sensor")?.value;
  const ha_inverse = getElementById("ha_inverse")?.checked;
  console.log(ha_inverse);

  chrome.storage.sync.set(
    {
      ha_url,
      ha_token,
      ha_sensor,
      ha_inverse,
    },
    function () {
      // Update status to let user know options were saved.
      const status = getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(function () {
        status.textContent = "";
      }, 750);
    }
  );
}

function restore_options() {
  chrome.storage.sync.get(
    {
      ha_url: "http://localhost:8123",
      ha_token: "(replace)",
      ha_sensor: "switch.mute_button",
      ha_inverse: false,
    },
    function (items) {
      getElementById("ha_url")!.value = items.ha_url;
      getElementById("ha_token")!.value = items.ha_token;
      getElementById("ha_sensor")!.value = items.ha_sensor;
      getElementById("ha_inverse")!.checked = items.ha_inverse;
    }
  );
}
document.addEventListener("DOMContentLoaded", restore_options);
getElementById("save")?.addEventListener("click", save_options);
