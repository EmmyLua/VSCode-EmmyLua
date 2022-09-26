//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    // const vscode = acquireVsCodeApi();
    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'psi':
                {
                    let element = document.getElementById("psi");
                    if (element) {
                        element.innerText = message.value;
                    }
                    break;
                }
        }
    });

}());

