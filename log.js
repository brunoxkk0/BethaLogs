const channel = new BroadcastChannel("betha-logs-fix");

const listener = (e) => {
    console.log("mensagem recebida")
    document.getElementById("base-text").innerText = e.data;
    channel.removeEventListener("message", listener);
};

channel.addEventListener("message", listener)