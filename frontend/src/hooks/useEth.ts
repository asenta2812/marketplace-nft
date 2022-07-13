import { useCallback, useEffect, useRef, useState } from 'react';
import Web3 from 'web3';
import type { Contract } from 'web3-eth-contract';

import { MessageError } from '@/components/message';

import useMetamask from './useMetamask';

/**
yarn
 */
const LIST_CONTRACT = {
  AsenToken: '0x9A676e781A523b5d0C0e43731313A708CB607508',
  Marketplace: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
  Petty: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
  Reserve: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
  TokenSale: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
};

const CONTRACT_NAMES = Object.keys(LIST_CONTRACT);
type ListContractType = {
  [key in typeof CONTRACT_NAMES[number]]: Contract;
};
type UseEthType = {
  web3: Web3;
  networkID: number;
  contracts: ListContractType;
};

const useEth = (): UseEthType => {
  const webRef = useRef<Web3 | null>(null);
  const networkIDRef = useRef<number>(0);
  const { provider } = useMetamask();

  const [contracts, setContracts] = useState<ListContractType>({});

  const getContract = (name: string, address: string): Contract => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const artifact = require(`../contracts/${name}.sol/${name}.json`);

    if (!networkIDRef.current || !webRef.current) {
      throw Error('No network');
    }

    const { abi } = artifact;
    return new webRef.current.eth.Contract(abi, address);
  };

  const init = useCallback(async () => {
    if (!webRef.current) {
      const web3 = new Web3(provider || Web3.givenProvider);
      webRef.current = web3;
    }
    if (!networkIDRef.current) {
      const networkID = await webRef.current.eth.net.getId();
      networkIDRef.current = networkID;
    }
    // const accounts = await webRef.current.eth.getAccounts();

    const instanceContracts: ListContractType = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const [name, address] of Object.entries(LIST_CONTRACT)) {
      instanceContracts[name] = getContract(name, address);
    }

    setContracts(instanceContracts);
  }, []);

  useEffect(() => {
    const tryInit = async () => {
      try {
        init();
      } catch (err) {
        MessageError(err as string, 'init_web3');
      }
    };

    tryInit();
  }, []);

  // useEffect(() => {
  //     const events = ['chainChanged', 'accountsChanged'];
  //     const handleChange = () => {
  //         init();
  //     };

  //     events.forEach((e) => window.ethereum.on(e, handleChange));
  //     return () => {
  //         events.forEach((e) =>
  //             window.ethereum.removeListener(e, handleChange)
  //         );
  //     };
  // }, [init]);

  return {
    web3: webRef.current as Web3,
    networkID: networkIDRef.current,
    contracts,
  };
};

export default useEth;
