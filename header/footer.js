/* =========================================================
   NISHAT FASHION FOOTER JS
========================================================= */


/* =========================================================
   CURRENT YEAR
========================================================= */

const yearElement =
    document.getElementById(
        "nfFooterYear"
    );

if (yearElement) {

    yearElement.textContent =
        new Date().getFullYear();

}


/* =========================================================
   NEWSLETTER
========================================================= */

const newsletterForm =
    document.getElementById(
        "nfNewsletterForm"
    );


newsletterForm?.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();


        const email =
            document.getElementById(
                "nfNewsletterEmail"
            )?.value.trim();


        if (!email) {
            return;
        }


        /*
         * এখানে পরে Google Sheet / Firebase /
         * অন্য newsletter service connect করা যাবে।
         */

        alert(
            "Thank you for subscribing!"
        );


        newsletterForm.reset();

    }
);