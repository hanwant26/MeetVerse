(function () {
    "use strict";

    const config =
        window.meetVerseLifecycle;

    const leaveButton =
        document.getElementById(
            "leaveMeetingButton"
        );

    const connectionStatus =
        document.getElementById(
            "connectionStatus"
        );


    function getCookie(name) {
        const cookies =
            document.cookie
                ? document.cookie.split(";")
                : [];

        for (const cookieValue of cookies) {
            const cookie = cookieValue.trim();

            if (
                cookie.startsWith(
                    `${name}=`
                )
            ) {
                return decodeURIComponent(
                    cookie.substring(
                        name.length + 1
                    )
                );
            }
        }

        return null;
    }


    function showStatus(message) {
        if (!connectionStatus) {
            return;
        }

        connectionStatus.hidden = false;

        connectionStatus.className =
            "connection-status connection-status-warning";

        connectionStatus.textContent =
            message;
    }


    async function recordLeave() {
        const csrfToken =
            getCookie("csrftoken");

        const response = await fetch(
            config.leaveUrl,
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json",
                    "X-CSRFToken": csrfToken,
                },
            }
        );

        if (!response.ok) {
            throw new Error(
                "Could not update the meeting status."
            );
        }

        return response.json();
    }


    async function leaveMeeting(event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        leaveButton.classList.add(
            "leave-control-disabled"
        );

        showStatus(
            "Leaving the meeting…"
        );

        try {
            const data =
                await recordLeave();

            window.location.href =
                data.redirect_url
                || config.dashboardUrl;

        } catch (error) {
            console.error(
                "Leave meeting error:",
                error
            );

            window.location.href =
                config.dashboardUrl;
        }
    }


    if (leaveButton && config) {
        leaveButton.addEventListener(
            "click",
            leaveMeeting,
            true
        );
    }
})();