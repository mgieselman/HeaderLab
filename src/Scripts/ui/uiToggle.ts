import {
    fluentAccordion,
    fluentAccordionItem,
    fluentBadge,
    fluentButton,
    fluentCard,
    fluentCheckbox,
    fluentDialog,
    fluentProgress,
    fluentProgressRing,
    fluentRadio,
    fluentRadioGroup,
    fluentToolbar,
    provideFluentDesignSystem
} from "@fluentui/web-components";
import "../../Content/fluentCommon.css";
import "../../Content/uiToggle.css";
import "../../Content/newDesktopFrame.css";
import "../../Content/themes/fluent-refresh.css";
import "../../Content/themes/neon-grid.css";

import { ParentFrame } from "../ParentFrame";
import "./components/MhaResults";

// Register all Fluent UI Web Components needed by both chrome and content
provideFluentDesignSystem().register(
    fluentAccordion(),
    fluentAccordionItem(),
    fluentBadge(),
    fluentButton(),
    fluentCard(),
    fluentCheckbox(),
    fluentDialog(),
    fluentProgress(),
    fluentProgressRing(),
    fluentRadio(),
    fluentRadioGroup(),
    fluentToolbar()
);

Office.onReady(async (info) => {
    if (info.host === Office.HostType.Outlook) {
        await ParentFrame.initUI();
    }
});
