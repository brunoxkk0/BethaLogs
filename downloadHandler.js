console.log("Olá mundo")
console.log("Carregando o ungzip do pako.js...")
import { ungzip } from "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.esm.mjs";

console.log("feito.")
chrome.downloads.onCreated.addListener(async (downloadItem) => {

    if (downloadItem.finalUrl.includes("logs/logs.txt.gz")) {

        console.log("Download de log detectado....")
        console.log(downloadItem)

        chrome.downloads.cancel(downloadItem.id, () => {
            console.log("Download cancelado...")
        })

        console.log("Tentando recuperar o texto do log.")
        fetch(downloadItem.finalUrl, { redirect: "follow" })
            .then((response) => response.blob())
            .then(async (response) => {

                const reader = new FileReader();

                reader.onload = function () {
                    // transforma ArrayBuffer em Uint8Array
                    const buffer = new Uint8Array(this.result);

                    // descompacta gzip -> string
                    const inflatedContent = ungzip(buffer, { to: 'string' });

                    chrome.tabs.create({ url: "./log.html" }).then((tab) => {

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

    }
})

chrome.downloads.onDeterminingFilename.addListener(async (downloadItem) => {
    if (downloadItem.finalUrl.includes("logs/logs.txt.gz")) {
        chrome.downloads.cancel(downloadItem.id, () => {
            console.log("Download cancelado...")
        })
    }
})