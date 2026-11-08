console.log("Olá mundo")
console.log("Carregando o ungzip do pako.js...")
import {ungzip} from "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.esm.mjs";

console.log("feito.")
chrome.downloads.onCreated.addListener(async (downloadItem) => {

    // Chrome reemite onCreated para itens antigos do histórico ao carregar a extensão; só trata downloads novos
    const isNew = downloadItem.state === "in_progress" && Date.now() - new Date(downloadItem.startTime).getTime() < 60000;

    if (isNew && downloadItem.finalUrl.includes("logs/logs.txt.gz")) {

        console.log("Download de log detectado....")
        console.log(downloadItem)

        chrome.downloads.cancel(downloadItem.id, () => {
            console.log("Download cancelado...")
        })

        console.log("Tentando recuperar o texto do log.")
        // url da Betha gera nova URL pré-assinada do S3 (finalUrl expira em 300s)
        fetch(downloadItem.url, {redirect: "follow"})
            .then((response) => {
                // URL já consumida (ex.: IDM interceptou) ou sessão expirada devolve HTML/erro em vez do .gz
                const type = response.headers.get("content-type") || "";
                if (!response.ok || type.includes("text/html")) {
                    throw new Error(`Resposta inválida do log: ${response.status} ${type}`);
                }
                return response.blob();
            })
            .then(async (response) => {

                const reader = new FileReader();

                reader.onload = function () {
                    // transforma ArrayBuffer em Uint8Array
                    const buffer = new Uint8Array(this.result);

                    // fetch pode já ter descompactado (Content-Encoding: gzip); só usa pako se houver header gzip (1f 8b)
                    const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
                    let inflatedContent;
                    try {
                        inflatedContent = isGzip
                            ? ungzip(buffer, {to: 'string'})
                            : new TextDecoder().decode(buffer);
                    } catch (e) {
                        console.error("Falha ao descompactar log:", e);
                        return;
                    }

                    chrome.tabs.create({url: "./log.html"}).then((tab) => {

                        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
                            if (tab.id === tabId) {
                                if (changeInfo.status && changeInfo.status === 'complete') {
                                    const channel = new BroadcastChannel("betha-logs-fix");
                                    channel.postMessage(inflatedContent);
                                }
                            }
                        })

                    })

                }

                reader.readAsArrayBuffer(response);

            })
            .catch((e) => console.error("Falha ao recuperar o log:", e))

    }
})

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {

    suggest();

    if (downloadItem.finalUrl?.includes("logs/logs.txt.gz")) {
        chrome.downloads.cancel(downloadItem.id, () => {
            console.log("Download cancelado...")
        })
    }

})
