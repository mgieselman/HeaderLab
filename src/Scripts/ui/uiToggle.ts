import {
    fluentButton,
    fluentCheckbox,
    fluentDialog,
    fluentRadio,
    fluentRadioGroup,
    fluentToolbar,
    provideFluentDesignSystem
} from "@fluentui/web-components";
import "../../Content/fluentCommon.css";
import "../../Content/uiToggle.css";
import "../../Content/themes/neon-grid.css";
import "../../Content/themes/fluent-refresh.css";
import "../../Content/themes/glassmorphism.css";
import "../../Content/themes/minimal-mono.css";
import "../../Content/themes/warm-earth.css";
import "../../Content/themes/aurora-nord.css";

import { ParentFrame } from "../ParentFrame";

// Register Fluent UI Web Components
provideFluentDesignSystem().register(
    fluentButton(),
    fluentCheckbox(),
    fluentDialog(),
    fluentRadio(),
    fluentRadioGroup(),
    fluentToolbar()
);

Office.onReady(async (info) => {
    if (info.host === Office.HostType.Outlook) {
        await ParentFrame.initUI();
    }
});