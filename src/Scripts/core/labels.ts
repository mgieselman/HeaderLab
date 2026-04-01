export const statusLabels = {
    loading: "Loading...",
    requestSent: "Retrieving headers from server.",
    foundHeaders: "Found headers",
    processingHeader: "Processing header",
    headersMissing: "Message was missing transport headers. If this is a sent item this may be expected.",
    messageMissing: "Message not located.",
    requestFailed: "Failed to retrieve headers.",
    analyzed: "Headers analyzed successfully",
    cleared: "Headers cleared",
    copied: "Copied to clipboard!",
    noHeaders: "Please enter headers to analyze",
    nothingToCopy: "No analysis results to copy",
    prompt: "Insert the message header you would like to analyze",
    parsingHeaders: "Parsing headers to tables",
    processingReceivedHeader: "Processing received header ",
} as const;

export const timeLabels = {
    negative: "-",
    minute: "minute",
    minutes: "minutes",
    second: "second",
    seconds: "seconds",
    deliveredStart: "(Delivered after",
    deliveredEnd: ")",
} as const;

export const summaryLabels = {
    summary: "Summary",
    subject: "Subject",
    messageId: "Message Id",
    creationTime: "Creation time",
    from: "From",
    replyTo: "Reply to",
    to: "To",
    cc: "Cc",
    archivedAt: "Archived at",
} as const;

export const receivedLabels = {
    receivedHeaders: "Received headers",
    receivedHop: "Hop",
    receivedSubmittingHost: "Submitting host",
    receivedReceivingHost: "Receiving host",
    receivedTime: "Time",
    receivedDelay: "Delay",
    receivedType: "Type",
    receivedFrom: "From",
    receivedBy: "By",
    receivedWith: "With",
    receivedId: "Id",
    receivedFor: "For",
    receivedVia: "Via",
    receivedDate: "Date",
    receivedPercent: "Percent",
} as const;

export const otherLabels = {
    otherHeaders: "Other headers",
    originalHeaders: "Original headers",
    number: "#",
    header: "Header",
    value: "Value",
} as const;

export const antispamLabels = {
    forefrontAntiSpamReport: "Forefront Antispam Report Header",
    antiSpamReport: "Microsoft Antispam Header",
    source: "Source header",
    unparsed: "Unknown fields",
    arc: "ARC protocol",
    countryRegion: "Country/Region",
    lang: "Language",
    scl: "Spam Confidence Level",
    sfv: "Spam Filtering Verdict",
    pcl: "Phishing Confidence Level",
    ipv: "IP Filter Verdict",
    helo: "HELO/EHLO String",
    ptr: "PTR Record",
    cip: "Connecting IP Address",
    cat: "Protection Policy Category",
    sfty: "Phishing message",
    srv: "Bulk email status",
    customSpam: "Advanced Spam Filtering",
    sfs: "Spam rules",
    bcl: "Bulk Complaint Level",
} as const;
