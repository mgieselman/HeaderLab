/**
 * Sample email headers for onboarding — lets users see the tool in action with one click.
 */

export const sampleHeaders = `Received: from BN6PR04MB0660.namprd04.prod.outlook.com (10.255.192.12) by
 BN6PR04MB0660.namprd04.prod.outlook.com (10.255.192.12) with SMTP;
 Tue, 17 Oct 2017 14:03:12 +0000
Received: from BN3NAM04HT205.eop-NAM04.prod.protection.outlook.com
 (2a01:111:e400:c418::34) by BN6PR04MB0660.namprd04.prod.outlook.com
 (2a01:111:e400:59e4::12) with Microsoft SMTP Server (version=TLS1_2,
 cipher=TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384_P384) id 15.20.77.7; Tue, 17
 Oct 2017 14:03:11 +0000
Received: from BN3NAM04FT042.eop-NAM04.prod.protection.outlook.com
 (10.152.92.57) by BN3NAM04HT205.eop-NAM04.prod.protection.outlook.com
 (10.152.93.134) with Microsoft SMTP Server (version=TLS1_2,
 cipher=TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384_P384) id 15.20.77.7 via
 Frontend Transport; Tue, 17 Oct 2017 14:03:11 +0000
Received: from ccm27.constantcontact.com (208.75.123.162) by
 BN3NAM04FT042.mail.protection.outlook.com (10.152.92.111) with Microsoft
 SMTP Server (version=TLS1_2,
 cipher=TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384_P384) id 15.20.77.7 via
 Frontend Transport; Tue, 17 Oct 2017 14:03:10 +0000
Authentication-Results: spf=pass (sender IP is 208.75.123.162)
 smtp.mailfrom=bounce-571822-42@in.constantcontact.com;
 dkim=pass (signature was verified)
 header.d=auth.ccsend.com;dmarc=none action=none
 header.from=contoso.com;
X-Forefront-Antispam-Report: CIP:208.75.123.162;CTRY:US;LANG:en;SCL:0;SRV:;IPV:NLI;SFV:NSPM;H:ccm27.constantcontact.com;PTR:ccm27.constantcontact.com;CAT:NONE;SFTY:;SFS:;DIR:INB;SFP:;
X-Microsoft-Antispam: BCL:1;
Subject: =?utf-8?Q?October newsletter?=
Message-ID: <1234567890@mail.contoso.com>
Date: Tue, 17 Oct 2017 10:03:09 -0400
From: "Contoso Newsletter" <newsletter@contoso.com>
To: user@example.com
Reply-To: newsletter@contoso.com
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=auth.ccsend.com;
 s=1000073432; t=1508245389;
 bh=abc123def456;
 h=Subject:From:Reply-To:To:Message-ID:Date:Content-Type:MIME-Version;
 b=xyz789`;
