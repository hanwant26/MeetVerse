(function () {
    "use strict";

    const STORAGE_KEYS = {
        audioinput: "meetverse_microphone_device_id",
        videoinput: "meetverse_camera_device_id",
    };

    let deviceRoom = null;
    let roomEventsRegistered = false;
    let browserEventRegistered = false;
    let refreshTimeout = null;

    let settingsButton = null;
    let settingsPanel = null;
    let settingsBackdrop = null;
    let microphoneSelect = null;
    let cameraSelect = null;
    let refreshButton = null;
    let statusElement = null;


    function getCurrentRoom() {
        if (
            typeof room === "undefined"
            || !room
        ) {
            return null;
        }

        return room;
    }


    function readSavedDevice(kind) {
        try {
            return (
                window.localStorage.getItem(
                    STORAGE_KEYS[kind]
                )
                || ""
            );
        } catch (error) {
            return "";
        }
    }


    function saveDevice(
        kind,
        deviceId
    ) {
        try {
            if (deviceId) {
                window.localStorage.setItem(
                    STORAGE_KEYS[kind],
                    deviceId
                );
            } else {
                window.localStorage.removeItem(
                    STORAGE_KEYS[kind]
                );
            }
        } catch (error) {
            console.warn(
                "Device preference could not be saved:",
                error
            );
        }
    }


    function addDeviceSettingsStyles() {
        if (
            document.getElementById(
                "meetVerseDeviceSettingsStyles"
            )
        ) {
            return;
        }

        const style = document.createElement(
            "style"
        );

        style.id =
            "meetVerseDeviceSettingsStyles";

        style.textContent = `
            .meetverse-device-backdrop {
                position: fixed;
                inset: 0;
                z-index: 1090;
                background: rgba(
                    15,
                    23,
                    42,
                    0.48
                );
                backdrop-filter: blur(2px);
            }

            .meetverse-device-backdrop[hidden],
            .meetverse-device-panel[hidden] {
                display: none !important;
            }

            .meetverse-device-panel {
                position: fixed;
                top: 0;
                right: 0;
                z-index: 1100;
                width: min(430px, 100%);
                height: 100vh;
                padding: 24px;
                overflow-y: auto;
                border-left: 1px solid #e2e8f0;
                background: #ffffff;
                box-shadow:
                    -16px 0 40px
                    rgba(
                        15,
                        23,
                        42,
                        0.18
                    );
            }

            .meetverse-device-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                margin-bottom: 22px;
            }

            .meetverse-device-header h2 {
                margin: 0 0 4px;
                color: #0f172a;
                font-size: 1.35rem;
            }

            .meetverse-device-header p {
                margin: 0;
                color: #64748b;
                font-size: 0.88rem;
            }

            .meetverse-device-close {
                display: inline-flex;
                width: 38px;
                height: 38px;
                flex-shrink: 0;
                align-items: center;
                justify-content: center;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #f8fafc;
                color: #0f172a;
                font-size: 1.2rem;
                cursor: pointer;
            }

            .meetverse-device-field {
                margin-bottom: 18px;
            }

            .meetverse-device-field label {
                display: block;
                margin-bottom: 7px;
                color: #1e293b;
                font-size: 0.9rem;
                font-weight: 700;
            }

            .meetverse-device-field select {
                width: 100%;
                min-height: 46px;
                padding: 9px 38px 9px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                background: #ffffff;
                color: #0f172a;
            }

            .meetverse-device-field select:focus {
                outline: 3px solid rgba(
                    99,
                    102,
                    241,
                    0.18
                );
                border-color: #6366f1;
            }

            .meetverse-device-field select:disabled {
                cursor: not-allowed;
                background: #f1f5f9;
                color: #64748b;
            }

            .meetverse-device-status {
                display: none;
                margin-bottom: 18px;
                padding: 11px 12px;
                border-radius: 10px;
                font-size: 0.85rem;
            }

            .meetverse-device-status-info {
                display: block;
                border: 1px solid #bfdbfe;
                background: #eff6ff;
                color: #1e40af;
            }

            .meetverse-device-status-success {
                display: block;
                border: 1px solid #bbf7d0;
                background: #f0fdf4;
                color: #166534;
            }

            .meetverse-device-status-error {
                display: block;
                border: 1px solid #fecaca;
                background: #fef2f2;
                color: #991b1b;
            }

            .meetverse-device-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 9px;
                margin-top: 22px;
            }

            .meetverse-device-note {
                margin-top: 20px;
                padding: 13px;
                border: 1px solid #e2e8f0;
                border-radius: 11px;
                background: #f8fafc;
                color: #64748b;
                font-size: 0.8rem;
            }

            @media (max-width: 576px) {
                .meetverse-device-panel {
                    padding: 20px;
                }

                .meetverse-device-actions,
                .meetverse-device-actions .btn {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function createSettingsButton() {
        const controls = document.querySelector(
            ".room-controls"
        );

        if (!controls) {
            return false;
        }

        const existingButton =
            document.getElementById(
                "meetVerseDeviceSettingsButton"
            );

        if (existingButton) {
            settingsButton = existingButton;
            return true;
        }

        settingsButton =
            document.createElement("button");

        settingsButton.type = "button";

        settingsButton.id =
            "meetVerseDeviceSettingsButton";

        settingsButton.className =
            "meeting-control-button";

        settingsButton.textContent = "⚙️";

        settingsButton.title =
            "Camera and microphone settings";

        settingsButton.disabled = true;

        settingsButton.setAttribute(
            "aria-label",
            "Open camera and microphone settings"
        );

        settingsButton.setAttribute(
            "aria-expanded",
            "false"
        );

        const reactionControl =
            controls.querySelector(
                ".meetverse-reaction-control"
            );

        const chatButton =
            document.getElementById(
                "chatButton"
            );

        controls.insertBefore(
            settingsButton,
            reactionControl
            || chatButton
            || null
        );

        settingsButton.addEventListener(
            "click",
            openSettingsPanel
        );

        return true;
    }


    function createSettingsPanel() {
        const existingPanel =
            document.getElementById(
                "meetVerseDeviceSettingsPanel"
            );

        if (existingPanel) {
            settingsPanel = existingPanel;

            settingsBackdrop =
                document.getElementById(
                    "meetVerseDeviceBackdrop"
                );

            microphoneSelect =
                document.getElementById(
                    "meetVerseMicrophoneSelect"
                );

            cameraSelect =
                document.getElementById(
                    "meetVerseCameraSelect"
                );

            refreshButton =
                document.getElementById(
                    "meetVerseRefreshDevicesButton"
                );

            statusElement =
                document.getElementById(
                    "meetVerseDeviceStatus"
                );

            return true;
        }

        settingsBackdrop =
            document.createElement("div");

        settingsBackdrop.id =
            "meetVerseDeviceBackdrop";

        settingsBackdrop.className =
            "meetverse-device-backdrop";

        settingsBackdrop.hidden = true;


        settingsPanel =
            document.createElement("aside");

        settingsPanel.id =
            "meetVerseDeviceSettingsPanel";

        settingsPanel.className =
            "meetverse-device-panel";

        settingsPanel.hidden = true;

        settingsPanel.setAttribute(
            "role",
            "dialog"
        );

        settingsPanel.setAttribute(
            "aria-modal",
            "true"
        );

        settingsPanel.setAttribute(
            "aria-labelledby",
            "meetVerseDeviceSettingsTitle"
        );

        settingsPanel.innerHTML = `
            <div class="meetverse-device-header">
                <div>
                    <h2 id="meetVerseDeviceSettingsTitle">
                        Device Settings
                    </h2>

                    <p>
                        Choose the camera and microphone
                        used in this meeting.
                    </p>
                </div>

                <button
                    type="button"
                    id="meetVerseCloseDeviceSettings"
                    class="meetverse-device-close"
                    aria-label="Close device settings"
                >
                    ×
                </button>
            </div>

            <div
                id="meetVerseDeviceStatus"
                class="meetverse-device-status"
                role="status"
                aria-live="polite"
            ></div>

            <div class="meetverse-device-field">
                <label for="meetVerseMicrophoneSelect">
                    🎤 Microphone
                </label>

                <select
                    id="meetVerseMicrophoneSelect"
                    aria-label="Select microphone"
                >
                    <option value="">
                        Loading microphones…
                    </option>
                </select>
            </div>

            <div class="meetverse-device-field">
                <label for="meetVerseCameraSelect">
                    📹 Camera
                </label>

                <select
                    id="meetVerseCameraSelect"
                    aria-label="Select camera"
                >
                    <option value="">
                        Loading cameras…
                    </option>
                </select>
            </div>

            <div class="meetverse-device-actions">
                <button
                    type="button"
                    id="meetVerseRefreshDevicesButton"
                    class="btn btn-outline-primary"
                >
                    Refresh Devices
                </button>

                <button
                    type="button"
                    id="meetVerseDoneDeviceSettings"
                    class="btn btn-primary"
                >
                    Done
                </button>
            </div>

            <div class="meetverse-device-note">
                Your selected devices are remembered in
                this browser for future MeetVerse meetings.
            </div>
        `;

        document.body.appendChild(
            settingsBackdrop
        );

        document.body.appendChild(
            settingsPanel
        );


        microphoneSelect =
            document.getElementById(
                "meetVerseMicrophoneSelect"
            );

        cameraSelect =
            document.getElementById(
                "meetVerseCameraSelect"
            );

        refreshButton =
            document.getElementById(
                "meetVerseRefreshDevicesButton"
            );

        statusElement =
            document.getElementById(
                "meetVerseDeviceStatus"
            );

        const closeButton =
            document.getElementById(
                "meetVerseCloseDeviceSettings"
            );

        const doneButton =
            document.getElementById(
                "meetVerseDoneDeviceSettings"
            );


        microphoneSelect.addEventListener(
            "change",
            function () {
                switchDevice(
                    "audioinput",
                    microphoneSelect.value
                );
            }
        );


        cameraSelect.addEventListener(
            "change",
            function () {
                switchDevice(
                    "videoinput",
                    cameraSelect.value
                );
            }
        );


        refreshButton.addEventListener(
            "click",
            function () {
                refreshDeviceLists(true);
            }
        );


        closeButton.addEventListener(
            "click",
            closeSettingsPanel
        );


        doneButton.addEventListener(
            "click",
            closeSettingsPanel
        );


        settingsBackdrop.addEventListener(
            "click",
            closeSettingsPanel
        );

        return true;
    }


    function setPanelStatus(
        message,
        statusType = "info"
    ) {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;

        statusElement.className =
            "meetverse-device-status "
            + "meetverse-device-status-"
            + statusType;
    }


    function clearPanelStatus() {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = "";

        statusElement.className =
            "meetverse-device-status";
    }


    function setInputsDisabled(
        disabled
    ) {
        if (microphoneSelect) {
            microphoneSelect.disabled =
                disabled;
        }

        if (cameraSelect) {
            cameraSelect.disabled =
                disabled;
        }

        if (refreshButton) {
            refreshButton.disabled =
                disabled;
        }
    }


    function openSettingsPanel() {
        if (
            !settingsPanel
            || !settingsBackdrop
            || !deviceRoom
        ) {
            return;
        }

        settingsPanel.hidden = false;
        settingsBackdrop.hidden = false;

        settingsButton.setAttribute(
            "aria-expanded",
            "true"
        );

        document.body.style.overflow =
            "hidden";

        refreshDeviceLists(false);

        window.setTimeout(
            function () {
                if (microphoneSelect) {
                    microphoneSelect.focus();
                }
            },
            50
        );
    }


    function closeSettingsPanel() {
        if (
            !settingsPanel
            || !settingsBackdrop
        ) {
            return;
        }

        settingsPanel.hidden = true;
        settingsBackdrop.hidden = true;

        document.body.style.overflow = "";

        if (settingsButton) {
            settingsButton.setAttribute(
                "aria-expanded",
                "false"
            );

            settingsButton.focus();
        }
    }


    async function getLocalDevices(
        kind
    ) {
        if (
            window.LivekitClient
            && window.LivekitClient.Room
            && typeof (
                window.LivekitClient
                    .Room
                    .getLocalDevices
            ) === "function"
        ) {
            return (
                window.LivekitClient
                    .Room
                    .getLocalDevices(
                        kind,
                        false
                    )
            );
        }

        if (
            !navigator.mediaDevices
            || !navigator.mediaDevices
                .enumerateDevices
        ) {
            return [];
        }

        const devices =
            await navigator
                .mediaDevices
                .enumerateDevices();

        return devices.filter(
            function (device) {
                return (
                    device.kind === kind
                );
            }
        );
    }


    function getActiveDevice(
        kind
    ) {
        if (
            deviceRoom
            && typeof deviceRoom
                .getActiveDevice
                === "function"
        ) {
            return (
                deviceRoom
                    .getActiveDevice(kind)
                || ""
            );
        }

        return "";
    }


    function populateDeviceSelect(
        selectElement,
        devices,
        kind
    ) {
        if (!selectElement) {
            return;
        }

        selectElement.innerHTML = "";

        if (!devices.length) {
            const emptyOption =
                document.createElement(
                    "option"
                );

            emptyOption.value = "";

            emptyOption.textContent =
                kind === "audioinput"
                    ? "No microphones found"
                    : "No cameras found";

            selectElement.appendChild(
                emptyOption
            );

            selectElement.disabled = true;

            return;
        }

        const activeDevice =
            getActiveDevice(kind);

        const savedDevice =
            readSavedDevice(kind);

        devices.forEach(
            function (
                device,
                index
            ) {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    device.deviceId;

                const fallbackLabel =
                    kind === "audioinput"
                        ? (
                            "Microphone "
                            + (index + 1)
                        )
                        : (
                            "Camera "
                            + (index + 1)
                        );

                option.textContent =
                    device.label
                    || fallbackLabel;

                selectElement.appendChild(
                    option
                );
            }
        );

        const availableIds =
            new Set(
                devices.map(
                    function (device) {
                        return device.deviceId;
                    }
                )
            );

        let selectedDevice = "";

        if (
            activeDevice
            && availableIds.has(
                activeDevice
            )
        ) {
            selectedDevice =
                activeDevice;

        } else if (
            savedDevice
            && availableIds.has(
                savedDevice
            )
        ) {
            selectedDevice =
                savedDevice;

        } else {
            selectedDevice =
                devices[0].deviceId;
        }

        selectElement.value =
            selectedDevice;

        selectElement.disabled = false;

        if (
            savedDevice
            && !availableIds.has(
                savedDevice
            )
        ) {
            saveDevice(
                kind,
                ""
            );
        }
    }


    async function refreshDeviceLists(
        showMessage = false
    ) {
        if (!deviceRoom) {
            return;
        }

        setInputsDisabled(true);

        if (showMessage) {
            setPanelStatus(
                "Refreshing available devices…",
                "info"
            );
        }

        try {
            const results =
                await Promise.all([
                    getLocalDevices(
                        "audioinput"
                    ),

                    getLocalDevices(
                        "videoinput"
                    ),
                ]);

            populateDeviceSelect(
                microphoneSelect,
                results[0],
                "audioinput"
            );

            populateDeviceSelect(
                cameraSelect,
                results[1],
                "videoinput"
            );

            if (showMessage) {
                setPanelStatus(
                    "Device list refreshed.",
                    "success"
                );
            } else {
                clearPanelStatus();
            }

        } catch (error) {
            console.error(
                "Device list error:",
                error
            );

            setPanelStatus(
                "MeetVerse could not read the available devices.",
                "error"
            );

        } finally {
            if (
                microphoneSelect
                && microphoneSelect.value
            ) {
                microphoneSelect.disabled =
                    false;
            }

            if (
                cameraSelect
                && cameraSelect.value
            ) {
                cameraSelect.disabled =
                    false;
            }

            if (refreshButton) {
                refreshButton.disabled =
                    false;
            }
        }
    }


    function getDeviceLabel(
        selectElement,
        fallbackLabel
    ) {
        if (
            !selectElement
            || selectElement.selectedIndex
                < 0
        ) {
            return fallbackLabel;
        }

        return (
            selectElement.options[
                selectElement.selectedIndex
            ].textContent
            || fallbackLabel
        );
    }


    async function switchDevice(
        kind,
        deviceId,
        options = {}
    ) {
        if (
            !deviceRoom
            || !deviceId
        ) {
            return;
        }

        const silent =
            Boolean(options.silent);

        const persist =
            options.persist !== false;

        const selectElement =
            kind === "audioinput"
                ? microphoneSelect
                : cameraSelect;

        const deviceType =
            kind === "audioinput"
                ? "microphone"
                : "camera";

        setInputsDisabled(true);

        if (!silent) {
            setPanelStatus(
                "Switching "
                + deviceType
                + "…",
                "info"
            );
        }

        try {
            const switched =
                await deviceRoom
                    .switchActiveDevice(
                        kind,
                        deviceId,
                        true
                    );

            if (persist) {
                saveDevice(
                    kind,
                    deviceId
                );
            }

            if (
                kind === "videoinput"
                && typeof attachLocalCamera
                    === "function"
            ) {
                window.setTimeout(
                    attachLocalCamera,
                    100
                );
            }

            if (!silent) {
                const selectedLabel =
                    getDeviceLabel(
                        selectElement,
                        deviceType
                    );

                if (switched === false) {
                    setPanelStatus(
                        selectedLabel
                        + " was saved and will be "
                        + "used when the "
                        + deviceType
                        + " is active.",
                        "success"
                    );
                } else {
                    setPanelStatus(
                        selectedLabel
                        + " is now active.",
                        "success"
                    );
                }
            }

        } catch (error) {
            console.error(
                deviceType
                + " switching error:",
                error
            );

            if (!silent) {
                setPanelStatus(
                    "The selected "
                    + deviceType
                    + " could not be activated.",
                    "error"
                );
            }

            await refreshDeviceLists(
                false
            );

        } finally {
            if (
                microphoneSelect
                && microphoneSelect.value
            ) {
                microphoneSelect.disabled =
                    false;
            }

            if (
                cameraSelect
                && cameraSelect.value
            ) {
                cameraSelect.disabled =
                    false;
            }

            if (refreshButton) {
                refreshButton.disabled =
                    false;
            }
        }
    }


    async function applySavedDevice(
        kind
    ) {
        if (!deviceRoom) {
            return;
        }

        const savedDevice =
            readSavedDevice(kind);

        if (!savedDevice) {
            return;
        }

        try {
            const devices =
                await getLocalDevices(
                    kind
                );

            const deviceExists =
                devices.some(
                    function (device) {
                        return (
                            device.deviceId
                            === savedDevice
                        );
                    }
                );

            if (!deviceExists) {
                saveDevice(
                    kind,
                    ""
                );

                return;
            }

            if (
                getActiveDevice(kind)
                === savedDevice
            ) {
                return;
            }

            await switchDevice(
                kind,
                savedDevice,
                {
                    silent: true,
                    persist: false,
                }
            );

        } catch (error) {
            console.warn(
                "Saved device could not be restored:",
                error
            );
        }
    }


    async function applySavedDevices() {
        await applySavedDevice(
            "audioinput"
        );

        await applySavedDevice(
            "videoinput"
        );

        await refreshDeviceLists(
            false
        );
    }


    function scheduleDeviceRefresh() {
        if (refreshTimeout) {
            window.clearTimeout(
                refreshTimeout
            );
        }

        refreshTimeout =
            window.setTimeout(
                function () {
                    refreshDeviceLists(
                        false
                    );
                },
                300
            );
    }


    function registerRoomEvents() {
        if (
            !deviceRoom
            || roomEventsRegistered
        ) {
            return;
        }

        roomEventsRegistered = true;

        deviceRoom.on(
            LivekitClient
                .RoomEvent
                .MediaDevicesChanged,

            scheduleDeviceRefresh
        );

        deviceRoom.on(
            LivekitClient
                .RoomEvent
                .ActiveDeviceChanged,

            function (
                kind,
                deviceId
            ) {
                if (
                    kind !== "audioinput"
                    && kind !== "videoinput"
                ) {
                    return;
                }

                saveDevice(
                    kind,
                    deviceId
                );

                scheduleDeviceRefresh();
            }
        );

        deviceRoom.on(
            LivekitClient
                .RoomEvent
                .LocalTrackPublished,

            function (publication) {
                if (
                    publication.source
                    === LivekitClient
                        .Track
                        .Source
                        .Camera
                ) {
                    applySavedDevice(
                        "videoinput"
                    );
                }

                if (
                    publication.source
                    === LivekitClient
                        .Track
                        .Source
                        .Microphone
                ) {
                    applySavedDevice(
                        "audioinput"
                    );
                }
            }
        );

        deviceRoom.on(
            LivekitClient
                .RoomEvent
                .Disconnected,

            function () {
                closeSettingsPanel();

                if (settingsButton) {
                    settingsButton.disabled =
                        true;
                }
            }
        );
    }


    function registerBrowserDeviceEvent() {
        if (
            browserEventRegistered
            || !navigator.mediaDevices
            || typeof navigator
                .mediaDevices
                .addEventListener
                !== "function"
        ) {
            return;
        }

        browserEventRegistered = true;

        navigator.mediaDevices.addEventListener(
            "devicechange",
            scheduleDeviceRefresh
        );
    }


    function initialiseDeviceSettings() {
        addDeviceSettingsStyles();

        const buttonCreated =
            createSettingsButton();

        const panelCreated =
            createSettingsPanel();

        if (
            !buttonCreated
            || !panelCreated
        ) {
            window.setTimeout(
                initialiseDeviceSettings,
                500
            );

            return;
        }

        const candidateRoom =
            getCurrentRoom();

        if (
            !candidateRoom
            || candidateRoom.state
                !== "connected"
        ) {
            window.setTimeout(
                initialiseDeviceSettings,
                500
            );

            return;
        }

        deviceRoom = candidateRoom;

        settingsButton.disabled = false;

        registerRoomEvents();
        registerBrowserDeviceEvent();

        window.setTimeout(
            applySavedDevices,
            900
        );
    }


    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Escape"
                && settingsPanel
                && !settingsPanel.hidden
            ) {
                closeSettingsPanel();
            }
        }
    );


    if (
        document.readyState
        === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseDeviceSettings
        );
    } else {
        initialiseDeviceSettings();
    }
})();