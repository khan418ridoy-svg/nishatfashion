// ==========================================
// NISHAT FASHION - COMMON LAYOUT LOADER
// Loads Header + Footer on every page
// Live Server Safe Version
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // ==========================================
        // BASE PATH
        // Relative to this common.js file
        // ==========================================

        const commonBase =
            new URL(
                "./",
                import.meta.url
            );


        // ==========================================
        // FILE PATHS
        // ==========================================

        const headerHTML =
            new URL(
                "../header/header.txt",
                commonBase
            );


        const headerCSS =
            new URL(
                "../header/header.css",
                commonBase
            );


        const headerJS =
            new URL(
                "../header/header.js",
                commonBase
            );


        const footerHTML =
            new URL(
                "../header/footer.txt",
                commonBase
            );


        const footerCSS =
            new URL(
                "../header/footer.css",
                commonBase
            );


        const footerJS =
            new URL(
                "../header/footer.js",
                commonBase
            );


        // ==========================================
        // LOAD CSS
        // ==========================================

        function loadCSS(
            href,
            id
        ) {

            /*
             * Already loaded?
             */

            if (
                document.getElementById(id)
            ) {

                return;

            }


            const link =
                document.createElement(
                    "link"
                );


            link.id =
                id;


            link.rel =
                "stylesheet";


            link.href =
                href.href;


            document.head.appendChild(
                link
            );

        }


        // ==========================================
        // LOAD JS
        // ==========================================

        function loadJS(
            src,
            id
        ) {

            return new Promise(
                (
                    resolve,
                    reject
                ) => {

                    /*
                     * Already loaded?
                     */

                    if (
                        document.getElementById(
                            id
                        )
                    ) {

                        resolve();

                        return;

                    }


                    const script =
                        document.createElement(
                            "script"
                        );


                    script.id =
                        id;


                    script.type =
                        "module";


                    script.src =
                        src.href;


                    script.onload =
                        () => {

                            resolve();

                        };


                    script.onerror =
                        (error) => {

                            reject(
                                error
                            );

                        };


                    document.body.appendChild(
                        script
                    );

                }
            );

        }


        // ==========================================
        // LOAD HTML
        // LIVE SERVER SAFE
        // ==========================================

        async function loadHTML(
            url
        ) {

            const response =
                await fetch(
                    url.href,
                    {
                        cache:
                            "no-store"
                    }
                );


            // ======================================
            // RESPONSE CHECK
            // ======================================

            if (
                !response.ok
            ) {

                throw new Error(
                    `Failed to load: ${url.href} (${response.status})`
                );

            }


            // ======================================
            // GET HTML
            // ======================================

            const html =
                await response.text();


            // ======================================
            // PARSE HTML
            // ======================================

            const parser =
                new DOMParser();


            const parsed =
                parser.parseFromString(
                    html,
                    "text/html"
                );


            // ======================================
            // REMOVE LIVE SERVER INJECTION
            // ======================================

            const scripts =
                parsed.querySelectorAll(
                    "script"
                );


            scripts.forEach(
                (script) => {

                    const scriptText =
                        script.textContent ||
                        "";


                    /*
                     * Live Server injected script
                     */

                    const isLiveServer =
                        scriptText.includes(
                            "Code injected by live-server"
                        ) ||
                        scriptText.includes(
                            "code injected by live-server"
                        ) ||
                        scriptText.includes(
                            "Live Server"
                        ) ||
                        scriptText.includes(
                            "live-server"
                        ) ||
                        scriptText.includes(
                            "WebSocket"
                        );


                    if (
                        isLiveServer
                    ) {

                        script.remove();

                    }

                }
            );


            // ======================================
            // RETURN CLEAN BODY HTML
            // ======================================

            return parsed
                .body
                .innerHTML
                .trim();

        }


        // ==========================================
        // INSERT HTML SAFELY
        // ==========================================

        function insertHTML(
            container,
            html
        ) {

            /*
             * Use template instead of directly
             * manipulating parsed document.
             */

            const template =
                document.createElement(
                    "template"
                );


            template.innerHTML =
                html;


            container.replaceChildren(
                template.content.cloneNode(
                    true
                )
            );

        }


        // ==========================================
        // HEADER
        // ==========================================

        async function loadHeader() {

            const container =
                document.getElementById(
                    "header"
                );


            // ======================================
            // HEADER CONTAINER NOT FOUND
            // ======================================

            if (!container) {

                console.warn(
                    "Nishat Fashion: #header container not found."
                );

                return;

            }


            try {

                // ==================================
                // FETCH HEADER HTML
                // ==================================

                const html =
                    await loadHTML(
                        headerHTML
                    );


                // ==================================
                // INSERT HEADER
                // ==================================

                insertHTML(
                    container,
                    html
                );


                console.log(
                    "Nishat Fashion: Header HTML inserted."
                );


                // ==================================
                // CHECK MOBILE MENU
                // ==================================

                const mobileMenu =
                    document.getElementById(
                        "nfMobileMenu"
                    );


                if (
                    mobileMenu
                ) {

                    console.log(
                        "Nishat Fashion: Mobile menu found."
                    );

                } else {

                    console.error(
                        "Nishat Fashion: #nfMobileMenu NOT found after header insertion."
                    );

                }


                // ==================================
                // LOAD HEADER CSS
                // ==================================

                loadCSS(
                    headerCSS,
                    "nishat-header-css"
                );


                // ==================================
                // LOAD HEADER JS
                // ==================================

                await loadJS(
                    headerJS,
                    "nishat-header-js"
                );


                console.log(
                    "Nishat Fashion: Header initialized."
                );


            } catch (
                error
            ) {

                console.error(
                    "Nishat Fashion: Header loading error:",
                    error
                );

            }

        }


        // ==========================================
        // FOOTER
        // ==========================================

        async function loadFooter() {

            const container =
                document.getElementById(
                    "footer"
                );


            // ======================================
            // FOOTER CONTAINER NOT FOUND
            // ======================================

            if (!container) {

                console.warn(
                    "Nishat Fashion: #footer container not found."
                );

                return;

            }


            try {

                // ==================================
                // FETCH FOOTER HTML
                // ==================================

                const html =
                    await loadHTML(
                        footerHTML
                    );


                // ==================================
                // INSERT FOOTER
                // ==================================

                insertHTML(
                    container,
                    html
                );


                console.log(
                    "Nishat Fashion: Footer HTML inserted."
                );


                // ==================================
                // LOAD FOOTER CSS
                // ==================================

                loadCSS(
                    footerCSS,
                    "nishat-footer-css"
                );


                // ==================================
                // LOAD FOOTER JS
                // ==================================

                await loadJS(
                    footerJS,
                    "nishat-footer-js"
                );


                console.log(
                    "Nishat Fashion: Footer initialized."
                );


            } catch (
                error
            ) {

                console.error(
                    "Nishat Fashion: Footer loading error:",
                    error
                );

            }

        }


        // ==========================================
        // START
        // ==========================================

        console.log(
            "Nishat Fashion: Common loader started."
        );


        // ==========================================
        // LOAD HEADER FIRST
        // ==========================================

        await loadHeader();


        // ==========================================
        // LOAD FOOTER SECOND
        // ==========================================

        await loadFooter();


        // ==========================================
        // COMPLETE
        // ==========================================

        console.log(
            "Nishat Fashion: Common layout loaded."
        );

    }
);