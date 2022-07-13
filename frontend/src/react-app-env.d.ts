interface Window {
  ethereum?: {
    isMetaMask: true;
    providers: any[];
    request: (...args: any[]) => Promise<any>;
    removeListener: (eventName: string, callback: Function) => void;
    on: (eventName: string, callback: Function) => void;
  };
  BinanceChain?: {
    bnbSign?: (
      address: string,
      message: string
    ) => Promise<{ publicKey: string; signature: string }>;
  };
}

type SerializedBigNumber = string;
