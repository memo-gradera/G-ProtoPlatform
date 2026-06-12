import React, { useEffect, useState } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { getMsalInstance } from '@/auth/msalInstance';
import { isMsalConfigured } from '@/auth/msalConfig';
import { isMsalAuthMode } from '@/lib/authMode';

export default function MsalProviderWrapper({ children }) {
  const [instance, setInstance] = useState(null);

  useEffect(() => {
    if (!isMsalAuthMode() || !isMsalConfigured()) {
      return;
    }

    let active = true;
    getMsalInstance().then((msal) => {
      if (active) {
        setInstance(msal);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (isMsalAuthMode() && isMsalConfigured()) {
    if (!instance) {
      return null;
    }
    return <MsalProvider instance={instance}>{children}</MsalProvider>;
  }

  return children;
}
