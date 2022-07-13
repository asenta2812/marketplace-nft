/* eslint-disable consistent-return */
import MetaMaskOnboarding from '@metamask/onboarding';
import { useEffect, useRef, useState } from 'react';

import { MessageError } from '@/components/message';

const useMetamask = () => {
  const onboarding = useRef<MetaMaskOnboarding>();
  const [accounts, setAccounts] = useState<string[]>([]);
  const onClickConnect = async () => {
    try {
      // Will open the MetaMask UI
      // You should disable this button while the request is pending!
      await window.ethereum
        ?.request({ method: 'eth_requestAccounts' })
        .then(setAccounts);
    } catch (error) {
      MessageError(error as string);
    }
  };
  useEffect(() => {
    if (!onboarding.current) {
      onboarding.current = new MetaMaskOnboarding();
    }
  }, []);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled() && onboarding.current) {
      if (accounts.length > 0) {
        onboarding.current.stopOnboarding();
      }
    }
  }, [accounts]);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      window.ethereum?.request({ method: 'eth_accounts' }).then(setAccounts);

      window.ethereum?.on('accountsChanged', setAccounts);

      return () => {
        window.ethereum?.removeListener('accountsChanged', setAccounts);
      };
    }
  }, []);

  return {
    provider: typeof window !== 'undefined' ? window.ethereum : null,
    accounts,
    onClickConnect,
  };
};

export default useMetamask;
