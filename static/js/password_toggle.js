document.addEventListener("DOMContentLoaded", () => {
    const passwordFields = document.querySelectorAll(
        'input[type="password"]'
    );

    passwordFields.forEach((passwordField) => {
        if (
            passwordField.dataset
                .meetversePasswordToggle === "ready"
        ) {
            return;
        }

        passwordField.dataset
            .meetversePasswordToggle = "ready";

        const wrapper = document.createElement(
            "div"
        );

        wrapper.className = (
            "mv-password-field-wrap"
        );

        passwordField.parentNode.insertBefore(
            wrapper,
            passwordField
        );

        wrapper.appendChild(
            passwordField
        );

        const toggleButton = document.createElement(
            "button"
        );

        toggleButton.type = "button";

        toggleButton.className = (
            "mv-password-toggle"
        );

        toggleButton.setAttribute(
            "aria-label",
            "Show password"
        );

        toggleButton.setAttribute(
            "title",
            "Show password"
        );

        toggleButton.innerHTML = (
            '<i class="bi bi-eye"></i>'
        );

        toggleButton.addEventListener(
            "click",
            () => {
                const passwordIsVisible = (
                    passwordField.type === "text"
                );

                passwordField.type = (
                    passwordIsVisible
                        ? "password"
                        : "text"
                );

                toggleButton.setAttribute(
                    "aria-label",
                    passwordIsVisible
                        ? "Show password"
                        : "Hide password"
                );

                toggleButton.setAttribute(
                    "title",
                    passwordIsVisible
                        ? "Show password"
                        : "Hide password"
                );

                toggleButton.innerHTML = (
                    passwordIsVisible
                        ? '<i class="bi bi-eye"></i>'
                        : '<i class="bi bi-eye-slash"></i>'
                );
            }
        );

        wrapper.appendChild(
            toggleButton
        );
    });
});