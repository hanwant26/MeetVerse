(function () {
    "use strict";

    const config =
        window.meetVerseAttendance || {};

    let attendanceSessionId = null;
    let joinRequestSent = false;
    let leaveRequestSent = false;
    let trackedRoom = null;


    function getCookie(name) {
        const cookies = document.cookie
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


    function getCsrfToken() {
        const cookieToken =
            getCookie("csrftoken");

        if (cookieToken) {
            return cookieToken;
        }

        const tokenInput =
            document.querySelector(
                "[name=csrfmiddlewaretoken]"
            );

        return tokenInput
            ? tokenInput.value
            : "";
    }


    function getCurrentRoom() {
        if (
            typeof room === "undefined"
            || !room
        ) {
            return null;
        }

        return room;
    }


    function getStorageKey() {
        return (
            "meetverse-attendance-"
            + String(
                config.meetingCode || ""
            )
        );
    }


    async function markAttendanceJoined() {
        if (
            joinRequestSent
            || !config.joinUrl
        ) {
            return;
        }

        joinRequestSent = true;

        try {
            const response = await fetch(
                config.joinUrl,
                {
                    method: "POST",
                    credentials: "same-origin",

                    headers: {
                        "Accept":
                            "application/json",

                        "Content-Type":
                            "application/json",

                        "X-CSRFToken":
                            getCsrfToken(),
                    },

                    body: JSON.stringify({}),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error
                    || "Attendance could not be started."
                );
            }

            attendanceSessionId =
                data.session_id;

            sessionStorage.setItem(
                getStorageKey(),
                String(attendanceSessionId)
            );

            console.log(
                "Attendance started:",
                attendanceSessionId
            );
        } catch (error) {
            joinRequestSent = false;

            console.error(
                "Attendance join error:",
                error
            );
        }
    }


    async function markAttendanceLeft() {
        if (
            leaveRequestSent
            || !config.leaveUrl
        ) {
            return;
        }

        leaveRequestSent = true;

        try {
            const response = await fetch(
                config.leaveUrl,
                {
                    method: "POST",
                    credentials: "same-origin",
                    keepalive: true,

                    headers: {
                        "Accept":
                            "application/json",

                        "Content-Type":
                            "application/json",

                        "X-CSRFToken":
                            getCsrfToken(),
                    },

                    body: JSON.stringify({
                        session_id:
                            attendanceSessionId,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Attendance session could not be closed."
                );
            }

            sessionStorage.removeItem(
                getStorageKey()
            );

            console.log(
                "Attendance session closed."
            );
        } catch (error) {
            leaveRequestSent = false;

            console.error(
                "Attendance leave error:",
                error
            );
        }
    }


    function sendLeaveBeacon() {
        if (
            leaveRequestSent
            || !config.leaveUrl
        ) {
            return;
        }

        leaveRequestSent = true;

        const formData =
            new FormData();

        formData.append(
            "csrfmiddlewaretoken",
            getCsrfToken()
        );

        if (attendanceSessionId) {
            formData.append(
                "session_id",
                String(attendanceSessionId)
            );
        }

        const beaconAccepted =
            navigator.sendBeacon(
                config.leaveUrl,
                formData
            );

        if (beaconAccepted) {
            sessionStorage.removeItem(
                getStorageKey()
            );
        } else {
            leaveRequestSent = false;

            markAttendanceLeft();
        }
    }


    function registerRoomEvents() {
        if (
            !trackedRoom
            || !window.LivekitClient
            || !LivekitClient.RoomEvent
        ) {
            return;
        }

        trackedRoom.on(
            LivekitClient.RoomEvent.Disconnected,
            function () {
                markAttendanceLeft();
            }
        );
    }


    function connectAttendanceToRoom() {
        const currentRoom =
            getCurrentRoom();

        if (
            !currentRoom
            || currentRoom.state
                !== "connected"
        ) {
            window.setTimeout(
                connectAttendanceToRoom,
                500
            );

            return;
        }

        trackedRoom = currentRoom;

        registerRoomEvents();
        markAttendanceJoined();
    }


    window.addEventListener(
        "pagehide",
        sendLeaveBeacon
    );


    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            connectAttendanceToRoom
        );
    } else {
        connectAttendanceToRoom();
    }
})();