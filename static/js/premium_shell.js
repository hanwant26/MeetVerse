document.addEventListener("DOMContentLoaded", () => {
    const documentElement = document.documentElement;
    const header = document.getElementById("site-header");
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-toggle-icon");

    function updateThemeIcon() {
        if (!themeIcon) {
            return;
        }

        const currentTheme = documentElement.getAttribute(
            "data-theme"
        );

        if (currentTheme === "dark") {
            themeIcon.className = "bi bi-sun";
            themeToggle.title = "Use light appearance";
        } else {
            themeIcon.className = "bi bi-moon-stars";
            themeToggle.title = "Use dark appearance";
        }
    }

    updateThemeIcon();

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = documentElement.getAttribute(
                "data-theme"
            );

            const nextTheme = (
                currentTheme === "dark"
                    ? "light"
                    : "dark"
            );

            documentElement.setAttribute(
                "data-theme",
                nextTheme
            );

            localStorage.setItem(
                "meetverse-theme",
                nextTheme
            );

            updateThemeIcon();
        });
    }

    function updateHeader() {
        if (!header) {
            return;
        }

        header.classList.toggle(
            "is-scrolled",
            window.scrollY > 8
        );
    }

    updateHeader();

    window.addEventListener(
        "scroll",
        updateHeader,
        {
            passive: true,
        }
    );

    document.querySelectorAll(
        "[data-current-year]"
    ).forEach((element) => {
        element.textContent = new Date().getFullYear();
    });

    const alerts = document.querySelectorAll(
        ".mv-alert"
    );

    alerts.forEach((alertElement) => {
        window.setTimeout(() => {
            if (
                window.bootstrap
                && bootstrap.Alert
            ) {
                const alert = bootstrap.Alert.getOrCreateInstance(
                    alertElement
                );

                alert.close();
            }
        }, 5000);
    });

    const navigationLinks = document.querySelectorAll(
        "#meetverseNavbar .nav-link"
    );

    navigationLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const navigationElement = document.getElementById(
                "meetverseNavbar"
            );

            if (
                navigationElement
                && navigationElement.classList.contains("show")
                && window.bootstrap
            ) {
                const collapse = bootstrap.Collapse.getOrCreateInstance(
                    navigationElement
                );

                collapse.hide();
            }
        });
    });
});