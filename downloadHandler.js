console.log("Olá mundo")
console.log("Carregando o inflate do pako.js...")
import {inflate} from "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.esm.mjs";

console.log("feito.")
chrome.downloads.onCreated.addListener(async (downloadItem) => {

    if (downloadItem.finalUrl.includes("logs/logs.txt.gz")) {

        console.log("Download de log detectado....")
        console.log(downloadItem)

        chrome.downloads.cancel(downloadItem.id, () => {
            console.log("Download cancelado...")
        })

        console.log("Tentando recuperar o texto do log.")
        fetch(downloadItem.finalUrl, {redirect: "follow"})
            .then((response) => response.blob())
            .then(async (response) => {

                const reader = new FileReader();

                reader.onload = function() {
                    // obtém o conteúdo da Blob em um ArrayBuffer
                    const buffer = this.result;

                    const inflatedContent = inflate(buffer, {to: 'string'});

                    chrome.tabs.create({url: "./log.html"}).then((tab) => {

                        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
                            if(tab.id === tabId){
                                if(changeInfo.status && changeInfo.status === 'complete'){
                                    const channel = new BroadcastChannel("betha-logs-fix");
                                    channel.postMessage(inflatedContent)
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